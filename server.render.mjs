import { spawn } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";

const publicPort = integerFromEnv("PORT", 3000);
const webPort = integerFromEnv("STONE_WEB_INTERNAL_PORT", 3101);
const streamPort = integerFromEnv("STONE_STREAM_INTERNAL_PORT", 3102);
const children = new Set();
let shuttingDown = false;

function integerFromEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 && value <= 65_535 ? value : fallback;
}

function startChild(name, entrypoint, port) {
  const child = spawn(process.execPath, [entrypoint], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
    },
    stdio: "inherit",
  });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;
    console.error(`[stone-daily] ${name} exited unexpectedly`, { code, signal });
    shutdown(1);
  });
  return child;
}

const web = startChild("web", "server.js", webPort);
const stream = startChild("market-stream", "workers/market-stream.mjs", streamPort);

function proxyRequest(incoming, outgoing, targetPort, pathname) {
  const headers = { ...incoming.headers };
  headers.host = `127.0.0.1:${targetPort}`;
  headers["x-forwarded-host"] = incoming.headers.host ?? "";
  headers["x-forwarded-proto"] = incoming.headers["x-forwarded-proto"] ?? "https";

  const proxy = httpRequest({
    hostname: "127.0.0.1",
    port: targetPort,
    method: incoming.method,
    path: pathname,
    headers,
  }, (response) => {
    outgoing.writeHead(response.statusCode ?? 502, response.headers);
    response.pipe(outgoing);
  });

  proxy.on("error", (error) => {
    console.error(`[stone-daily] proxy failure on ${pathname}`, error.message);
    if (outgoing.headersSent) return outgoing.destroy(error);
    outgoing.writeHead(503, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": "3",
    });
    outgoing.end(JSON.stringify({ status: "starting", service: targetPort === streamPort ? "market-stream" : "web" }));
  });
  incoming.pipe(proxy);
}

async function serviceHealthy(port, path) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      signal: AbortSignal.timeout(2_500),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

const gateway = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname === "/healthz") {
    const [webHealthy, streamHealthy] = await Promise.all([
      serviceHealthy(webPort, "/api/status"),
      serviceHealthy(streamPort, "/health"),
    ]);
    response.writeHead(webHealthy && streamHealthy ? 200 : 503, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    return response.end(JSON.stringify({
      status: webHealthy && streamHealthy ? "healthy" : "starting",
      web: webHealthy,
      stream: streamHealthy,
    }));
  }

  if (url.pathname === "/stream" || url.pathname.startsWith("/stream/")) {
    const rewrittenPath = `${url.pathname.slice("/stream".length) || "/"}${url.search}`;
    return proxyRequest(request, response, streamPort, rewrittenPath);
  }

  return proxyRequest(request, response, webPort, `${url.pathname}${url.search}`);
});

gateway.keepAliveTimeout = 70_000;
gateway.headersTimeout = 75_000;
gateway.listen(publicPort, "0.0.0.0", () => {
  console.log(`[stone-daily] consolidated gateway listening on 0.0.0.0:${publicPort}`);
});

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  gateway.close();
  const activeChildren = Array.from(children);
  const exits = activeChildren.map((child) => new Promise((resolve) => child.once("exit", resolve)));
  for (const child of activeChildren) child.kill("SIGTERM");
  const forceTimer = setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
    process.exit(exitCode);
  }, 8_000);
  forceTimer.unref();
  Promise.allSettled(exits).finally(() => process.exit(exitCode));
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

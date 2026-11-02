type EndpointLoader<T> = (url: string) => Promise<T>;

type EndpointOptions<T> = {
  service: string;
  load: EndpointLoader<T>;
  validate: (value: T) => boolean;
};

function failureReason(error: unknown) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function endpointName(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export async function fetchFirstValidFromEndpointGroups<T>(
  endpointGroups: ReadonlyArray<ReadonlyArray<string>>,
  options: EndpointOptions<T>,
): Promise<T> {
  const failures: string[] = [];

  for (const endpoints of endpointGroups) {
    try {
      return await Promise.any(endpoints.map(async (url) => {
        const value = await options.load(url);
        if (!options.validate(value)) throw new Error("empty or invalid payload");
        return value;
      }));
    } catch (error) {
      const reasons = error instanceof AggregateError ? error.errors : [error];
      reasons.forEach((reason, index) => {
        failures.push(`${endpointName(endpoints[index] ?? endpoints[0])}: ${failureReason(reason)}`);
      });
    }
  }

  throw new Error(`${options.service} endpoints unavailable (${failures.join(" | ") || "no endpoints configured"})`);
}

export async function fetchValidWithRetry<T>(
  url: string,
  attempts: number,
  options: EndpointOptions<T>,
) {
  const failures: string[] = [];
  const totalAttempts = Math.max(1, attempts);

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      const value = await options.load(url);
      if (!options.validate(value)) throw new Error("empty or invalid payload");
      return value;
    } catch (error) {
      failures.push(`attempt ${attempt}: ${failureReason(error)}`);
    }
  }

  throw new Error(`${options.service} unavailable at ${endpointName(url)} (${failures.join(" | ")})`);
}

type OriginCheckInput = {
  configuredOrigin?: string | null;
  forwardedHost?: string | null;
  origin?: string | null;
  requestHost?: string | null;
  urlHost: string;
};

function normalizedHost(value?: string | null) {
  return value?.split(",", 1)[0]?.trim().toLowerCase() || null;
}

export function isAllowedRequestOrigin(input: OriginCheckInput) {
  if (!input.origin) return true;
  try {
    const originHost = new URL(input.origin).host.toLowerCase();
    const configuredHost = input.configuredOrigin ? new URL(input.configuredOrigin).host.toLowerCase() : null;
    return [configuredHost, normalizedHost(input.forwardedHost), normalizedHost(input.requestHost), normalizedHost(input.urlHost)]
      .filter(Boolean)
      .includes(originHost);
  } catch { return false; }
}

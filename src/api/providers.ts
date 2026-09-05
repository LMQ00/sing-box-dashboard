// Clash API client for proxy providers.
//
// The reF1nd sing-box fork exposes its `providers` feature through the Clash
// API (experimental.clash_api) under `/providers/proxies`, which the stock
// sing-box kernel does not provide. This client talks directly to that
// endpoint; the daemon RPC used by the rest of the dashboard has no provider
// methods.

export interface ProviderProxy {
  name: string;
  type: string;
  udp?: boolean;
  history?: unknown[];
}

export interface ProviderSubscriptionInfo {
  Upload?: number;
  Download?: number;
  Total?: number;
  Expire?: number;
}

export interface ProviderInfo {
  type: string;
  vehicleType: string;
  name: string;
  proxies: ProviderProxy[];
  updatedAt: string;
  subscriptionInfo?: ProviderSubscriptionInfo | null;
}

export interface ProvidersResponse {
  providers: Record<string, ProviderInfo>;
}

async function request(
  baseUrl: string,
  secret: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = /^https?:\/\//i.test(baseUrl) ? baseUrl : `http://${baseUrl}`;
  const headers = new Headers(init?.headers);
  if (secret !== "") {
    headers.set("Authorization", `Bearer ${secret}`);
  }
  const response = await fetch(`${base.replace(/\/+$/, "")}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (typeof body.message === "string" && body.message !== "") {
        message = body.message;
      }
    } catch {
      // Non-JSON error body; keep the status text.
    }
    throw new Error(message);
  }
  return response;
}

export async function fetchProviders(baseUrl: string, secret: string): Promise<ProvidersResponse> {
  const response = await request(baseUrl, secret, "/providers/proxies");
  return (await response.json()) as ProvidersResponse;
}

export async function updateProvider(
  baseUrl: string,
  secret: string,
  name: string,
): Promise<void> {
  await request(baseUrl, secret, `/providers/proxies/${encodeURIComponent(name)}`, {
    method: "PUT",
  });
}

const BASE = "/api";

/**
 * Clerk token management.
 * When Clerk is active, API requests wait for the token to be available
 * before firing, ensuring every authenticated request has the JWT.
 */
let clerkTokenGetter: (() => Promise<string | null>) | null = null;
let clerkReady = false;
let clerkReadyResolvers: Array<() => void> = [];

export function setClerkTokenGetter(getter: (() => Promise<string | null>) | null) {
  clerkTokenGetter = getter;
  if (getter) {
    clerkReady = true;
    for (const resolve of clerkReadyResolvers) resolve();
    clerkReadyResolvers = [];
  } else {
    clerkReady = false;
  }
}

/** Mark that Clerk is enabled but not yet ready — API calls will wait */
export function setClerkEnabled() {
  // Just signals that we should wait for the getter
}

function waitForClerkReady(timeoutMs = 5000): Promise<void> {
  if (clerkReady) return Promise.resolve();
  return new Promise((resolve) => {
    clerkReadyResolvers.push(resolve);
    setTimeout(resolve, timeoutMs); // Don't block forever
  });
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const CLERK_ENABLED = Boolean(
  typeof window !== "undefined" &&
  import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY
);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? undefined);
  const body = init?.body;
  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Wait for Clerk to be ready before making authenticated API calls
  if (CLERK_ENABLED && !clerkReady && !path.startsWith("/health")) {
    await waitForClerkReady();
  }

  // Inject Clerk Bearer token when available
  if (clerkTokenGetter && !headers.has("Authorization")) {
    try {
      const token = await clerkTokenGetter();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch {
      // Token fetch failed — proceed without it
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    headers,
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(
      (errorBody as { error?: string } | null)?.error ?? `Request failed: ${res.status}`,
      res.status,
      errorBody,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

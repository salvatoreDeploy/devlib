import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "../auth-storage";
import { refreshSession } from "./auth";

export class SessionExpiredError extends Error {}

let inFlightRefresh: Promise<string | null> | null = null;

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.assign("/login?sessionExpired=1");
  }
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const tokens = await refreshSession(refreshToken);
    saveTokens(tokens);
    return tokens.accessToken;
  } catch {
    return null;
  }
}

function getRefreshedAccessToken(): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = performRefresh().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

// No 401, renova via /auth/refresh (dedupe em getRefreshedAccessToken) e repete a chamada.
export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const call = (accessToken: string | null) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${accessToken ?? ""}`,
      },
    });

  const response = await call(getAccessToken());

  if (response.status !== 401) {
    return response;
  }

  const newAccessToken = await getRefreshedAccessToken();

  if (!newAccessToken) {
    clearTokens();
    redirectToLogin();
    throw new SessionExpiredError("Sessão expirada");
  }

  return call(newAccessToken);
}

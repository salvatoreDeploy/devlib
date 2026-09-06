import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { authenticatedFetch, SessionExpiredError } from "./http-client";
import { refreshSession } from "./auth";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "../auth-storage";

vi.mock("./auth", async () => {
  const actual = await vi.importActual<typeof import("./auth")>("./auth");
  return { ...actual, refreshSession: vi.fn() };
});

describe("authenticatedFetch", () => {
  const assignSpy = vi.fn();

  beforeAll(() => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign: assignSpy },
      writable: true,
    });
  });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3333");
    vi.mocked(refreshSession).mockReset();
    assignSpy.mockClear();
    clearTokens();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envia o Authorization header com o access token atual e retorna a resposta quando não é 401", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const response = await authenticatedFetch("/projects");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3333/projects");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
  });

  it("renova a sessão e repete a chamada original quando a primeira resposta é 401", async () => {
    saveTokens({
      accessToken: "expired-access-token",
      refreshToken: "refresh-token",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(refreshSession).mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    const response = await authenticatedFetch("/projects");

    expect(response.status).toBe(200);
    expect(refreshSession).toHaveBeenCalledWith("refresh-token");
    expect(getAccessToken()).toBe("new-access-token");
    expect(getRefreshToken()).toBe("new-refresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, retryInit] = fetchMock.mock.calls[1];
    expect(retryInit.headers).toMatchObject({
      Authorization: "Bearer new-access-token",
    });
  });

  it("limpa os tokens e redireciona pro login quando não há refresh token", async () => {
    saveTokens({ accessToken: "expired-access-token", refreshToken: "" });
    const fetchMock = vi.fn().mockResolvedValue({ status: 401, ok: false });
    vi.stubGlobal("fetch", fetchMock);

    await expect(authenticatedFetch("/projects")).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    expect(refreshSession).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    expect(assignSpy).toHaveBeenCalledWith("/login?sessionExpired=1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("limpa os tokens e redireciona pro login quando a renovação falha", async () => {
    saveTokens({
      accessToken: "expired-access-token",
      refreshToken: "revoked-refresh-token",
    });
    const fetchMock = vi.fn().mockResolvedValue({ status: 401, ok: false });
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(refreshSession).mockRejectedValue(new Error("Sessão inválida"));

    await expect(authenticatedFetch("/projects")).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(assignSpy).toHaveBeenCalledWith("/login?sessionExpired=1");
  });

  it("reaproveita a mesma renovação para chamadas concorrentes que expiram ao mesmo tempo", async () => {
    saveTokens({
      accessToken: "expired-access-token",
      refreshToken: "refresh-token",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true })
      .mockResolvedValueOnce({ status: 200, ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(refreshSession).mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    const [responseA, responseB] = await Promise.all([
      authenticatedFetch("/projects"),
      authenticatedFetch("/libraries"),
    ]);

    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

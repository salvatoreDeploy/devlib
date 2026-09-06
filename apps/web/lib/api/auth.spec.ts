import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login, LoginError, refreshSession, RefreshSessionError } from "./auth";

describe("login", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3333");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("retorna os tokens quando a API responde 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: "access-token",
          refreshToken: "refresh-token",
        }),
      }),
    );

    const result = await login({
      email: "ana@example.com",
      password: "senha1234",
    });

    expect(result).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          email: "ana@example.com",
          password: "senha1234",
        }),
      }),
    );
  });

  it("lança LoginError com a mensagem da API quando a resposta não é ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Credenciais inválidas" }),
      }),
    );

    await expect(
      login({ email: "ana@example.com", password: "senha-errada" }),
    ).rejects.toThrow(LoginError);
    await expect(
      login({ email: "ana@example.com", password: "senha-errada" }),
    ).rejects.toThrow("Credenciais inválidas");
  });
});

describe("refreshSession", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3333");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envia o refreshToken e retorna o par de tokens novo quando a API responde 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        }),
      }),
    );

    const result = await refreshSession("refresh-token");

    expect(result).toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/auth/refresh",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ refreshToken: "refresh-token" }),
      }),
    );
  });

  it("lança RefreshSessionError com a mensagem da API quando o refresh token é inválido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Refresh token inválido ou expirado" }),
      }),
    );

    await expect(refreshSession("refresh-token-revogado")).rejects.toThrow(
      RefreshSessionError,
    );
    await expect(refreshSession("refresh-token-revogado")).rejects.toThrow(
      "Refresh token inválido ou expirado",
    );
  });
});

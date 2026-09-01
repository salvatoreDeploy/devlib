import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login, LoginError } from "./auth";

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

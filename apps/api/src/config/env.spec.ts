import { afterEach, describe, expect, it } from "vitest";
import { getAuthConfig } from "./env";

const ENV_KEYS = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
] as const;

describe("getAuthConfig", () => {
  const original = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  );

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  });

  function setValidEnv() {
    process.env.JWT_SECRET = "segredo-de-acesso";
    process.env.JWT_REFRESH_SECRET = "segredo-de-refresh";
    process.env.JWT_ACCESS_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  }

  it("retorna a config quando todas as variáveis estão definidas", () => {
    setValidEnv();

    expect(getAuthConfig()).toEqual({
      jwtSecret: "segredo-de-acesso",
      jwtRefreshSecret: "segredo-de-refresh",
      accessExpiresIn: "15m",
      refreshExpiresIn: "7d",
    });
  });

  it("lança erro claro quando JWT_SECRET não está definida", () => {
    setValidEnv();
    delete process.env.JWT_SECRET;

    expect(() => getAuthConfig()).toThrow(/JWT_SECRET/);
  });

  it("lança erro claro quando JWT_REFRESH_SECRET não está definida", () => {
    setValidEnv();
    delete process.env.JWT_REFRESH_SECRET;

    expect(() => getAuthConfig()).toThrow(/JWT_REFRESH_SECRET/);
  });

  it("lança erro claro quando JWT_ACCESS_EXPIRES_IN não está definida", () => {
    setValidEnv();
    delete process.env.JWT_ACCESS_EXPIRES_IN;

    expect(() => getAuthConfig()).toThrow(/JWT_ACCESS_EXPIRES_IN/);
  });

  it("lança erro claro quando JWT_REFRESH_EXPIRES_IN não está definida", () => {
    setValidEnv();
    delete process.env.JWT_REFRESH_EXPIRES_IN;

    expect(() => getAuthConfig()).toThrow(/JWT_REFRESH_EXPIRES_IN/);
  });
});

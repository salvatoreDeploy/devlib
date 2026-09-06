import { describe, expect, it } from "vitest";
import { decodeAccessToken } from "./session";

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildToken(payload: unknown): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe("decodeAccessToken", () => {
  it("retorna id e email a partir do payload (sub/email) do token", () => {
    const token = buildToken({
      sub: "user-1",
      email: "ana@example.com",
      exp: 9999999999,
    });

    expect(decodeAccessToken(token)).toEqual({
      id: "user-1",
      email: "ana@example.com",
    });
  });

  it("retorna null quando o token não tem 3 segmentos", () => {
    expect(decodeAccessToken("token-invalido")).toBeNull();
  });

  it("retorna null quando o payload não é JSON válido", () => {
    const token = `header.${base64Url("não-é-json")}.signature`;

    expect(decodeAccessToken(token)).toBeNull();
  });

  it("retorna null quando o payload não tem sub/email como string", () => {
    const token = buildToken({ sub: "user-1" });

    expect(decodeAccessToken(token)).toBeNull();
  });
});

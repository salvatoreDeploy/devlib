import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
} from "./token.service";

describe("signAccessToken", () => {
  it("gera um JWT verificável com o secret e contém o payload", () => {
    const token = signAccessToken(
      { sub: "user-1", email: "ana@example.com" },
      "access-secret",
      "15m",
    );

    const decoded = jwt.verify(token, "access-secret") as {
      sub: string;
      email: string;
    };
    expect(decoded.sub).toBe("user-1");
    expect(decoded.email).toBe("ana@example.com");
  });

  it("não verifica com um secret errado", () => {
    const token = signAccessToken(
      { sub: "user-1", email: "ana@example.com" },
      "access-secret",
      "15m",
    );

    expect(() => jwt.verify(token, "secret-errado")).toThrow();
  });
});

describe("signRefreshToken", () => {
  it("gera um JWT verificável com o secret de refresh e contém o payload", () => {
    const { token } = signRefreshToken(
      { sub: "user-1" },
      "refresh-secret",
      "7d",
    );

    const decoded = jwt.verify(token, "refresh-secret") as { sub: string };
    expect(decoded.sub).toBe("user-1");
  });

  it("retorna expiresAt correspondente ao exp do próprio token", () => {
    const { token, expiresAt } = signRefreshToken(
      { sub: "user-1" },
      "refresh-secret",
      "7d",
    );

    const decoded = jwt.decode(token) as { exp: number };
    expect(expiresAt).toEqual(new Date(decoded.exp * 1000));
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("verifyAccessToken", () => {
  it("retorna o payload quando o token é válido", () => {
    const token = signAccessToken(
      { sub: "user-1", email: "ana@example.com" },
      "access-secret",
      "15m",
    );

    const payload = verifyAccessToken(token, "access-secret");

    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("ana@example.com");
  });

  it("lança erro quando o secret está errado", () => {
    const token = signAccessToken(
      { sub: "user-1", email: "ana@example.com" },
      "access-secret",
      "15m",
    );

    expect(() => verifyAccessToken(token, "secret-errado")).toThrow();
  });

  it("lança erro quando o token está expirado", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "ana@example.com" },
      "access-secret",
      { expiresIn: -10 },
    );

    expect(() => verifyAccessToken(token, "access-secret")).toThrow();
  });
});

describe("hashToken", () => {
  it("retorna o hash SHA-256 do token em hex", () => {
    const token = "token-de-exemplo";

    expect(hashToken(token)).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
  });

  it("é determinístico: o mesmo token sempre gera o mesmo hash", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("tokens diferentes geram hashes diferentes", () => {
    expect(hashToken("abc")).not.toBe(hashToken("xyz"));
  });
});

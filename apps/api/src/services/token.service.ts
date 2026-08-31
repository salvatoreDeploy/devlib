import { createHash, randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export type RefreshTokenPayload = {
  sub: string;
  email: string;
};

export function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  expiresIn: string,
): string {
  // @types/jsonwebtoken tipa expiresIn como um literal de template (ex: "15m"),
  // mas o valor vem de env var validada só como string não-vazia em runtime.
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

export function signRefreshToken(
  payload: RefreshTokenPayload,
  secret: string,
  expiresIn: string,
): { token: string; expiresAt: Date } {
  // jti garante um token único por emissão: sem ele, dois refresh tokens
  // assinados no mesmo segundo com o mesmo payload são byte-a-byte
  // idênticos (JWT/HS256 é determinístico), o que quebraria a rotação.
  const token = jwt.sign({ ...payload, jti: randomUUID() }, secret, {
    expiresIn,
  } as SignOptions);
  const decoded = jwt.decode(token) as { exp: number };

  return { token, expiresAt: new Date(decoded.exp * 1000) };
}

export function verifyAccessToken(
  token: string,
  secret: string,
): AccessTokenPayload {
  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(
  token: string,
  secret: string,
): RefreshTokenPayload {
  return jwt.verify(token, secret) as RefreshTokenPayload;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

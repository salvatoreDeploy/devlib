import * as argon2 from "argon2";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "./token.service";
import type { AuthConfig } from "../config/env";

export class EmailAlreadyInUseError extends Error {
  constructor(email: string) {
    super(`Email já está em uso: ${email}`);
    this.name = "EmailAlreadyInUseError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Credenciais inválidas");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super("Refresh token inválido");
    this.name = "InvalidRefreshTokenError";
  }
}

export type RegisterInput = {
  email: string;
  password: string;
};

export type RegisteredUser = {
  id: string;
  email: string;
  createdAt: Date;
};

export type AuthRepository = {
  findUserByEmail(email: string): Promise<{ id: string } | undefined>;
  insertUser(data: {
    email: string;
    passwordHash: string;
  }): Promise<{ id: string; email: string; createdAt: Date }>;
};

export async function registerUser(
  repository: AuthRepository,
  input: RegisterInput,
): Promise<RegisteredUser> {
  const existing = await repository.findUserByEmail(input.email);

  if (existing) {
    throw new EmailAlreadyInUseError(input.email);
  }

  const passwordHash = await argon2.hash(input.password);
  const user = await repository.insertUser({
    email: input.email,
    passwordHash,
  });

  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginRepository = {
  findUserByEmail(
    email: string,
  ): Promise<{ id: string; email: string; passwordHash: string } | undefined>;
  insertRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
};

export async function loginUser(
  repository: LoginRepository,
  config: AuthConfig,
  input: LoginInput,
): Promise<LoginTokens> {
  const user = await repository.findUserByEmail(input.email);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await argon2.verify(
    user.passwordHash,
    input.password,
  );

  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const accessToken = signAccessToken(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    config.accessExpiresIn,
  );
  const { token: refreshToken, expiresAt } = signRefreshToken(
    { sub: user.id, email: user.email },
    config.jwtRefreshSecret,
    config.refreshExpiresIn,
  );

  await repository.insertRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

export type RefreshInput = {
  refreshToken: string;
};

export type RefreshRepository = {
  findRefreshTokenByHash(tokenHash: string): Promise<
    | {
        id: string;
        userId: string;
        expiresAt: Date;
        revokedAt: Date | null;
      }
    | undefined
  >;
  revokeRefreshToken(id: string): Promise<void>;
  insertRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
};

export async function refreshSession(
  repository: RefreshRepository,
  config: AuthConfig,
  input: RefreshInput,
): Promise<LoginTokens> {
  let payload: { sub: string; email: string };
  try {
    payload = verifyRefreshToken(input.refreshToken, config.jwtRefreshSecret);
  } catch {
    throw new InvalidRefreshTokenError();
  }

  const stored = await repository.findRefreshTokenByHash(
    hashToken(input.refreshToken),
  );

  if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    throw new InvalidRefreshTokenError();
  }

  await repository.revokeRefreshToken(stored.id);

  const accessToken = signAccessToken(
    { sub: stored.userId, email: payload.email },
    config.jwtSecret,
    config.accessExpiresIn,
  );
  const { token: refreshToken, expiresAt } = signRefreshToken(
    { sub: stored.userId, email: payload.email },
    config.jwtRefreshSecret,
    config.refreshExpiresIn,
  );

  await repository.insertRefreshToken({
    userId: stored.userId,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

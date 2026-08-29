import * as argon2 from "argon2";

export class EmailAlreadyInUseError extends Error {
  constructor(email: string) {
    super(`Email já está em uso: ${email}`);
    this.name = "EmailAlreadyInUseError";
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

import * as argon2 from "argon2";
import type {
  UserRecord,
  UsersRepository,
} from "../repositories/users.repository";
import { EmailAlreadyInUseError } from "./auth.service";

export type { UserRecord, UsersRepository };
export { EmailAlreadyInUseError };

export type UpdateUserRepository = UsersRepository & {
  revokeAllRefreshTokensByUserId(userId: string): Promise<void>;
};

export class UserNotFoundError extends Error {
  constructor() {
    super("Usuário não encontrado");
    this.name = "UserNotFoundError";
  }
}

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super("Senha atual incorreta");
    this.name = "InvalidCurrentPasswordError";
  }
}

export async function getCurrentUser(
  repository: UsersRepository,
  userId: string,
): Promise<UserRecord> {
  const user = await repository.findUserById(userId);

  if (!user) {
    throw new UserNotFoundError();
  }

  return user;
}

export type UpdateCurrentUserInput = {
  userId: string;
  data: {
    name?: string;
    email?: string;
    password?: string;
    currentPassword?: string;
  };
};

export async function updateCurrentUser(
  repository: UpdateUserRepository,
  { userId, data }: UpdateCurrentUserInput,
): Promise<UserRecord> {
  const user = await getCurrentUser(repository, userId);

  if (data.email || data.password) {
    const currentPasswordMatches = await argon2.verify(
      user.passwordHash,
      data.currentPassword ?? "",
    );

    if (!currentPasswordMatches) {
      throw new InvalidCurrentPasswordError();
    }
  }

  if (data.email && data.email !== user.email) {
    const existing = await repository.findUserByEmail(data.email);

    if (existing && existing.id !== userId) {
      throw new EmailAlreadyInUseError(data.email);
    }
  }

  const passwordHash = data.password
    ? await argon2.hash(data.password)
    : undefined;

  const updated = await repository.updateUser(userId, {
    name: data.name,
    email: data.email,
    passwordHash,
  });

  if (!updated) {
    throw new UserNotFoundError();
  }

  if (data.password) {
    await repository.revokeAllRefreshTokensByUserId(userId);
  }

  return updated;
}

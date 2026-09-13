import type {
  UserRecord,
  UsersRepository,
} from "../repositories/users.repository";

export type { UserRecord, UsersRepository };

export class UserNotFoundError extends Error {
  constructor() {
    super("Usuário não encontrado");
    this.name = "UserNotFoundError";
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

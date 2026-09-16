import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { UsersRepository } from "../repositories/users.repository";
import type { AvatarStorage } from "../services/avatar-storage.service";
import { InvalidFileTypeError } from "../services/avatar-storage.service";
import type { AuthConfig } from "../config/env";

const fakeAuthConfig: AuthConfig = {
  jwtSecret: "access-secret",
  jwtRefreshSecret: "refresh-secret",
  accessExpiresIn: "15m",
  refreshExpiresIn: "7d",
};

function authHeader(userId = "user-1") {
  const token = signAccessToken(
    { sub: userId, email: "ana@example.com" },
    fakeAuthConfig.jwtSecret,
    fakeAuthConfig.accessExpiresIn,
  );
  return `Bearer ${token}`;
}

function fakeUsersRepository(
  overrides: Partial<UsersRepository> = {},
): UsersRepository {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(undefined),
    findUserById: vi.fn().mockResolvedValue(undefined),
    insertUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function fakeAvatarStorage(
  overrides: Partial<AvatarStorage> = {},
): AvatarStorage {
  return {
    saveAvatarFile: vi
      .fn()
      .mockResolvedValue({ url: "/uploads/avatars/novo.png" }),
    deleteAvatarFile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function multipartPhotoPayload(
  buffer: Buffer,
  filename = "avatar.png",
  contentType = "image/png",
) {
  const form = new FormData();
  form.append("photo", new Blob([buffer], { type: contentType }), filename);
  const response = new Response(form);

  return {
    payload: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") as string,
  };
}

describe("POST /users/me/photo", () => {
  it("retorna 200, salva o arquivo e atualiza o avatarUrl do usuário", async () => {
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash: "hash",
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-09-16T00:00:00Z"),
      updatedAt: new Date("2026-09-16T00:00:00Z"),
    };
    const updated = { ...user, avatarUrl: "/uploads/avatars/novo.png" };
    const app = buildServer({
      usersRepository: fakeUsersRepository({
        findUserById: vi.fn().mockResolvedValue(user),
        updateUser: vi.fn().mockResolvedValue(updated),
      }),
      avatarStorage: fakeAvatarStorage(),
      authConfig: fakeAuthConfig,
    });
    const { payload, contentType } = await multipartPhotoPayload(
      Buffer.from("conteúdo-fake"),
    );

    const response = await app.inject({
      method: "POST",
      url: "/users/me/photo",
      headers: { authorization: authHeader(), "content-type": contentType },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      avatarUrl: "/uploads/avatars/novo.png",
    });
    expect(response.json()).not.toHaveProperty("passwordHash");
  });

  it("retorna 400 quando nenhum arquivo é enviado", async () => {
    const app = buildServer({
      usersRepository: fakeUsersRepository({
        findUserById: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "ana@example.com",
          passwordHash: "hash",
          name: "Ana",
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }),
      avatarStorage: fakeAvatarStorage(),
      authConfig: fakeAuthConfig,
    });
    const form = new FormData();
    const response0 = new Response(form);
    const payload = Buffer.from(await response0.arrayBuffer());
    const contentType = response0.headers.get("content-type") as string;

    const response = await app.inject({
      method: "POST",
      url: "/users/me/photo",
      headers: { authorization: authHeader(), "content-type": contentType },
      payload,
    });

    expect(response.statusCode).toBe(400);
  });

  it("retorna 400 quando o tipo de arquivo não é suportado", async () => {
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash: "hash",
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const app = buildServer({
      usersRepository: fakeUsersRepository({
        findUserById: vi.fn().mockResolvedValue(user),
      }),
      avatarStorage: fakeAvatarStorage({
        saveAvatarFile: vi
          .fn()
          .mockRejectedValue(new InvalidFileTypeError("application/pdf")),
      }),
      authConfig: fakeAuthConfig,
    });
    const { payload, contentType } = await multipartPhotoPayload(
      Buffer.from("%PDF-1.4"),
      "documento.pdf",
      "application/pdf",
    );

    const response = await app.inject({
      method: "POST",
      url: "/users/me/photo",
      headers: { authorization: authHeader(), "content-type": contentType },
      payload,
    });

    expect(response.statusCode).toBe(400);
  });

  it("retorna 404 quando o usuário do token não existe mais", async () => {
    const app = buildServer({
      usersRepository: fakeUsersRepository(),
      avatarStorage: fakeAvatarStorage(),
      authConfig: fakeAuthConfig,
    });
    const { payload, contentType } = await multipartPhotoPayload(
      Buffer.from("a"),
    );

    const response = await app.inject({
      method: "POST",
      url: "/users/me/photo",
      headers: {
        authorization: authHeader("id-inexistente"),
        "content-type": contentType,
      },
      payload,
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      usersRepository: fakeUsersRepository(),
      avatarStorage: fakeAvatarStorage(),
      authConfig: fakeAuthConfig,
    });
    const { payload, contentType } = await multipartPhotoPayload(
      Buffer.from("a"),
    );

    const response = await app.inject({
      method: "POST",
      url: "/users/me/photo",
      headers: { "content-type": contentType },
      payload,
    });

    expect(response.statusCode).toBe(401);
  });
});

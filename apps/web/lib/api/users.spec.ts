import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentUser,
  GetCurrentUserError,
  updateCurrentUser,
  UpdateCurrentUserError,
  uploadAvatar,
  UploadAvatarError,
} from "./users";
import { authenticatedFetch } from "./http-client";

vi.mock("./http-client", () => ({ authenticatedFetch: vi.fn() }));

describe("getCurrentUser", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("retorna o perfil do usuário autenticado", async () => {
    const user = {
      id: "user-1",
      email: "ana@example.com",
      name: "Ana Ribeiro",
      avatarUrl: "/uploads/avatars/foo.png",
      createdAt: "2026-09-05T00:00:00.000Z",
      updatedAt: "2026-09-05T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(user),
    } as Response);

    const result = await getCurrentUser();

    expect(result).toEqual(user);
    expect(authenticatedFetch).toHaveBeenCalledWith("/users/me");
  });

  it("lança GetCurrentUserError com a mensagem da API quando a busca falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Usuário não encontrado" }),
    } as Response);

    await expect(getCurrentUser()).rejects.toThrow("Usuário não encontrado");
    await expect(getCurrentUser()).rejects.toBeInstanceOf(GetCurrentUserError);
  });
});

describe("updateCurrentUser", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("envia PATCH com o body correto e retorna o perfil atualizado", async () => {
    const user = {
      id: "user-1",
      email: "ana@example.com",
      name: "Ana Ribeiro",
      avatarUrl: null,
      createdAt: "2026-09-05T00:00:00.000Z",
      updatedAt: "2026-09-05T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(user),
    } as Response);

    const result = await updateCurrentUser({ name: "Ana Ribeiro" });

    expect(result).toEqual(user);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/users/me",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ana Ribeiro" }),
      }),
    );
  });

  it("lança UpdateCurrentUserError com a mensagem da API quando a atualização falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "currentPassword é obrigatório para trocar e-mail ou senha",
        }),
    } as Response);

    await expect(
      updateCurrentUser({ email: "novo@example.com" }),
    ).rejects.toThrow(
      "currentPassword é obrigatório para trocar e-mail ou senha",
    );
    await expect(
      updateCurrentUser({ email: "novo@example.com" }),
    ).rejects.toBeInstanceOf(UpdateCurrentUserError);
  });
});

describe("uploadAvatar", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("envia POST multipart com o arquivo no campo photo e retorna o perfil atualizado", async () => {
    const user = {
      id: "user-1",
      email: "ana@example.com",
      name: "Ana Ribeiro",
      avatarUrl: "/uploads/avatars/novo.png",
      createdAt: "2026-09-05T00:00:00.000Z",
      updatedAt: "2026-09-05T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(user),
    } as Response);
    const file = new File(["conteúdo"], "avatar.png", { type: "image/png" });

    const result = await uploadAvatar(file);

    expect(result).toEqual(user);
    const [path, init] = vi.mocked(authenticatedFetch).mock.calls[0];
    expect(path).toBe("/users/me/photo");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("photo")).toBe(file);
  });

  it("lança UploadAvatarError com a mensagem da API quando o upload falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: "Tipo de arquivo não suportado: text/plain" }),
    } as Response);
    const file = new File(["conteúdo"], "arquivo.txt", { type: "text/plain" });

    await expect(uploadAvatar(file)).rejects.toThrow(
      "Tipo de arquivo não suportado: text/plain",
    );
    await expect(uploadAvatar(file)).rejects.toBeInstanceOf(UploadAvatarError);
  });
});

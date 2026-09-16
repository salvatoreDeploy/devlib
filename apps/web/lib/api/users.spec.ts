import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, GetCurrentUserError } from "./users";
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProfileMenu } from "./profile-menu";
import { clearTokens, getAccessToken, saveTokens } from "../lib/auth-storage";
import { getCurrentUser } from "../lib/api/users";
import { logout } from "../lib/api/auth";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../lib/api/users", () => ({ getCurrentUser: vi.fn() }));

vi.mock("../lib/api/auth", async () => {
  const actual =
    await vi.importActual<typeof import("../lib/api/auth")>("../lib/api/auth");
  return { ...actual, logout: vi.fn() };
});

const session = { id: "user-1", email: "ana@example.com" };

const fakeUser = {
  id: "user-1",
  email: "ana@example.com",
  name: "Ana Ribeiro",
  avatarUrl: null,
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
};

function renderProfileMenu() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileMenu session={session} />
    </QueryClientProvider>,
  );
}

describe("ProfileMenu", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(logout).mockReset();
    clearTokens();
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("mostra o e-mail e a inicial do avatar no trigger, sem precisar abrir o menu", () => {
    renderProfileMenu();

    expect(screen.getByText("ana@example.com")).not.toBeNull();
    expect(screen.getByText("A")).not.toBeNull();
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("ao abrir o menu, busca o perfil completo e mostra o nome na identidade", async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser);
    renderProfileMenu();

    await user.click(screen.getByRole("button", { name: /ana@example.com/i }));

    expect(await screen.findByText("Ana Ribeiro")).not.toBeNull();
  });

  it('tem o item "Editar perfil" linkando pra /profile', async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser);
    renderProfileMenu();

    await user.click(screen.getByRole("button", { name: /ana@example.com/i }));
    const editLink = await screen.findByRole("menuitem", {
      name: /editar perfil/i,
    });

    expect(editLink.getAttribute("href")).toBe("/profile");
  });

  it('ao clicar em "Sair da conta", chama logout, limpa os tokens e redireciona pra /login', async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser);
    vi.mocked(logout).mockResolvedValue(undefined);
    renderProfileMenu();

    await user.click(screen.getByRole("button", { name: /ana@example.com/i }));
    await user.click(
      await screen.findByRole("menuitem", { name: /sair da conta/i }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
    expect(logout).toHaveBeenCalledWith("refresh-token");
    expect(getAccessToken()).toBeNull();
  });

  it("limpa a sessão e redireciona mesmo se a chamada de logout falhar (melhor esforço)", async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser);
    vi.mocked(logout).mockRejectedValue(new Error("offline"));
    renderProfileMenu();

    await user.click(screen.getByRole("button", { name: /ana@example.com/i }));
    await user.click(
      await screen.findByRole("menuitem", { name: /sair da conta/i }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
    expect(getAccessToken()).toBeNull();
  });
});

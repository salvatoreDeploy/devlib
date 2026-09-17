import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProfilePage from "./page";
import {
  getCurrentUser,
  GetCurrentUserError,
  updateCurrentUser,
  UpdateCurrentUserError,
  uploadAvatar,
  UploadAvatarError,
} from "../../lib/api/users";
import {
  clearTokens,
  getAccessToken,
  saveTokens,
} from "../../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../../lib/api/users", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api/users")>(
    "../../lib/api/users",
  );
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    updateCurrentUser: vi.fn(),
    uploadAvatar: vi.fn(),
  };
});

const profile = {
  id: "user-1",
  email: "ana@example.com",
  name: "Ana Ribeiro",
  avatarUrl: null,
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
};

function renderProfilePage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(updateCurrentUser).mockReset();
    vi.mocked(uploadAvatar).mockReset();
    clearTokens();
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("redireciona pra /login quando não há access token", async () => {
    clearTokens();
    renderProfilePage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("busca o perfil e pré-preenche nome e e-mail", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(profile);
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Ana Ribeiro")).not.toBeNull();
    });
    expect(screen.getByDisplayValue("ana@example.com")).not.toBeNull();
  });

  it("mostra as iniciais do nome completo quando o usuário não tem avatarUrl", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(profile);
    renderProfilePage();

    expect(await screen.findByText("AR")).not.toBeNull();
  });

  it("mostra a imagem do avatar (prefixada com a URL da API) quando avatarUrl existe", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3333");
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...profile,
      avatarUrl: "/uploads/avatars/foo.png",
    });
    renderProfilePage();

    const img = await screen.findByRole("img", { name: /foto de perfil/i });
    expect(img.getAttribute("src")).toBe(
      "http://localhost:3333/uploads/avatars/foo.png",
    );
    vi.unstubAllEnvs();
  });

  it("mostra as iniciais quando avatarUrl existe mas a imagem falha ao carregar (arquivo apagado/link quebrado)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3333");
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...profile,
      avatarUrl: "/uploads/avatars/nao-existe-mais.png",
    });
    renderProfilePage();

    const img = await screen.findByRole("img", { name: /foto de perfil/i });
    fireEvent.error(img);

    expect(await screen.findByText("AR")).not.toBeNull();
    expect(screen.queryByRole("img", { name: /foto de perfil/i })).toBeNull();
    vi.unstubAllEnvs();
  });

  it("envia a foto selecionada via uploadAvatar e atualiza o preview", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(profile);
    vi.mocked(uploadAvatar).mockResolvedValue({
      ...profile,
      avatarUrl: "/uploads/avatars/novo.png",
    });
    const user = userEvent.setup();
    renderProfilePage();
    await screen.findByDisplayValue("Ana Ribeiro");

    const file = new File(["conteúdo"], "avatar.png", { type: "image/png" });
    const input = screen.getByLabelText(/enviar nova foto/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(vi.mocked(uploadAvatar).mock.calls[0]?.[0]).toBe(file);
    });
    expect(
      await screen.findByRole("img", { name: /foto de perfil/i }),
    ).not.toBeNull();
  });

  it("mostra a mensagem de erro da API quando o upload da foto falha", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(profile);
    vi.mocked(uploadAvatar).mockRejectedValue(
      new UploadAvatarError("Arquivo maior que o limite permitido (2MB)"),
    );
    const user = userEvent.setup();
    renderProfilePage();
    await screen.findByDisplayValue("Ana Ribeiro");

    // precisa bater com o accept="image/*" do input — o próprio browser (e o
    // userEvent, que replica esse filtro) já barra um tipo fora do accept
    // antes mesmo do change disparar; a rejeição real (ex: 413) vem da API.
    const file = new File(["x"], "grande.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/enviar nova foto/i), file);

    expect(
      await screen.findByText("Arquivo maior que o limite permitido (2MB)"),
    ).not.toBeNull();
  });

  it("salva só o nome quando apenas o nome muda, sem exigir senha atual", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(profile);
    vi.mocked(updateCurrentUser).mockResolvedValue({
      ...profile,
      name: "Ana R.",
    });
    renderProfilePage();
    await screen.findByDisplayValue("Ana Ribeiro");

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: "Ana R." },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(updateCurrentUser).toHaveBeenCalledWith({ name: "Ana R." });
    });
    expect(await screen.findByText(/perfil atualizado/i)).not.toBeNull();
    expect(pushMock).not.toHaveBeenCalledWith("/login");
  });

  it("exige senha atual (sem chamar a API) quando o e-mail muda sem informá-la", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(profile);
    renderProfilePage();
    await screen.findByDisplayValue("Ana Ribeiro");

    fireEvent.change(screen.getByLabelText(/^e-mail$/i), {
      target: { value: "nova@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(screen.getByText(/senha atual/i)).not.toBeNull();
    });
    expect(updateCurrentUser).not.toHaveBeenCalled();
  });

  it("troca o e-mail quando a senha atual é informada", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(profile);
    vi.mocked(updateCurrentUser).mockResolvedValue({
      ...profile,
      email: "nova@example.com",
    });
    renderProfilePage();
    await screen.findByDisplayValue("Ana Ribeiro");

    fireEvent.change(screen.getByLabelText(/^e-mail$/i), {
      target: { value: "nova@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: "senha-atual-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(updateCurrentUser).toHaveBeenCalledWith({
        email: "nova@example.com",
        currentPassword: "senha-atual-123",
      });
    });
  });

  it("troca a senha e força novo login (a API revoga todos os refresh tokens, incluindo o desta sessão)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(profile);
    vi.mocked(updateCurrentUser).mockResolvedValue(profile);
    renderProfilePage();
    await screen.findByDisplayValue("Ana Ribeiro");

    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: "senha-atual-123" },
    });
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: "senha-nova-456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(updateCurrentUser).toHaveBeenCalledWith({
        password: "senha-nova-456",
        currentPassword: "senha-atual-123",
      });
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
    expect(getAccessToken()).toBeNull();
  });

  it("mostra a mensagem de erro da API quando salvar falha (ex: senha atual incorreta)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(profile);
    vi.mocked(updateCurrentUser).mockRejectedValue(
      new UpdateCurrentUserError("Senha atual incorreta"),
    );
    renderProfilePage();
    await screen.findByDisplayValue("Ana Ribeiro");

    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: "senha-errada" },
    });
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: "senha-nova-456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(await screen.findByText("Senha atual incorreta")).not.toBeNull();
  });

  it('"Cancelar" leva de volta pra / sem salvar', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(profile);
    renderProfilePage();
    await screen.findByDisplayValue("Ana Ribeiro");

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(pushMock).toHaveBeenCalledWith("/");
    expect(updateCurrentUser).not.toHaveBeenCalled();
  });

  it("mostra mensagem de erro quando a busca do perfil falha", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(
      new GetCurrentUserError("Usuário não encontrado"),
    );
    renderProfilePage();

    expect(await screen.findByText("Usuário não encontrado")).not.toBeNull();
  });
});

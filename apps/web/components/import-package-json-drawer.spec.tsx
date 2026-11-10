import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImportPackageJsonDrawer } from "./import-package-json-drawer";
import {
  importProjectLibraries,
  ImportProjectLibrariesError,
  type ImportReport,
  type ImportReportItem,
} from "../lib/api/projects";

vi.mock("../lib/api/projects", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/projects")>(
    "../lib/api/projects",
  );
  return { ...actual, importProjectLibraries: vi.fn() };
});

const packageJson = JSON.stringify({
  name: "devlib-app",
  dependencies: {
    next: "15.0.3",
    react: "^18.3.1",
    "drizzle-orm": "^0.44.0",
    zod: "^3.25.0",
  },
  devDependencies: {
    "drizzle-orm": "^0.45.2",
    vitest: "^3.2.0",
    eslint: "^9.0.0",
  },
});

function item(
  name: string,
  action: ImportReportItem["action"],
  extra: Partial<ImportReportItem> = {},
): ImportReportItem {
  return {
    name,
    version: null,
    action,
    libraryId: action === "create" ? null : `library-${name}`,
    previousVersion: null,
    ...extra,
  };
}

const preview: ImportReport = {
  dryRun: true,
  summary: { create: 2, associate: 1, updateVersion: 1, unchanged: 2 },
  items: [
    item("next", "create", { version: "15.0.3" }),
    item("react", "updateVersion", {
      version: "^18.3.1",
      previousVersion: "^18.2.0",
    }),
    item("drizzle-orm", "unchanged", { previousVersion: "^0.44.0" }),
    item("zod", "unchanged", {
      version: "^3.25.0",
      previousVersion: "^3.25.0",
    }),
    item("vitest", "associate", { version: "^3.2.0" }),
    item("eslint", "create", { version: "^9.0.0" }),
  ],
};

const applied: ImportReport = {
  dryRun: false,
  summary: { create: 2, associate: 1, updateVersion: 2, unchanged: 0 },
  items: [
    item("next", "create", { version: "15.0.3", libraryId: "library-next" }),
    item("react", "updateVersion", {
      version: "^18.3.1",
      previousVersion: "^18.2.0",
    }),
    item("drizzle-orm", "updateVersion", {
      version: "^0.45.2",
      previousVersion: "^0.44.0",
    }),
    item("vitest", "associate", { version: "^3.2.0" }),
    item("eslint", "create", {
      version: "^9.0.0",
      libraryId: "library-eslint",
    }),
  ],
};

function renderDrawer(open = true) {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <ImportPackageJsonDrawer
        projectId="project-1"
        projectName="DevLib"
        open={open}
        onOpenChange={onOpenChange}
      />
    </QueryClientProvider>,
  );
  return { onOpenChange, invalidateSpy };
}

type User = ReturnType<typeof userEvent.setup>;

async function pasteAndPreview(user: User, text = packageJson) {
  await user.click(screen.getByRole("tab", { name: /colar json/i }));
  const textarea = screen.getByRole("textbox", {
    name: /conteúdo do package\.json/i,
  });
  await user.click(textarea);
  await user.paste(text);
  await user.click(screen.getByRole("button", { name: /pré-visualizar/i }));
}

async function goToPreview(user: User) {
  vi.mocked(importProjectLibraries).mockResolvedValueOnce(preview);
  await pasteAndPreview(user);
  await screen.findByRole("group", { name: "dependencies" });
}

describe("ImportPackageJsonDrawer", () => {
  beforeEach(() => {
    vi.mocked(importProjectLibraries).mockReset();
  });

  it("não renderiza o conteúdo fechado", () => {
    renderDrawer(false);

    expect(screen.queryByText("Importar package.json")).toBeNull();
  });

  describe("entrada", () => {
    it("abre na aba Arquivo, com Pré-visualizar desabilitado até ter conteúdo", () => {
      renderDrawer();

      expect(screen.getByText("Importar package.json")).not.toBeNull();
      expect(
        screen
          .getByRole("tab", { name: /arquivo/i })
          .getAttribute("aria-selected"),
      ).toBe("true");
      expect(
        (
          screen.getByRole("button", {
            name: /pré-visualizar/i,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
    });

    it("lê o arquivo escolhido e manda a prévia (dryRun) pelo mesmo parser do texto colado", async () => {
      const user = userEvent.setup();
      vi.mocked(importProjectLibraries).mockResolvedValueOnce(preview);
      renderDrawer();

      await user.upload(
        screen.getByLabelText(/arquivo package\.json/i),
        new File([packageJson], "package.json", { type: "application/json" }),
      );
      expect(await screen.findByText("package.json")).not.toBeNull();
      await user.click(screen.getByRole("button", { name: /pré-visualizar/i }));

      await waitFor(() => {
        expect(importProjectLibraries).toHaveBeenCalledWith("project-1", {
          items: [
            { name: "next", version: "15.0.3" },
            { name: "react", version: "^18.3.1" },
            { name: "drizzle-orm" },
            { name: "zod", version: "^3.25.0" },
            { name: "vitest", version: "^3.2.0" },
            { name: "eslint", version: "^9.0.0" },
          ],
          dryRun: true,
        });
      });
    });

    it("aceita o arquivo arrastado e solto na área de upload", async () => {
      renderDrawer();

      fireEvent.drop(screen.getByText(/arraste o package\.json/i), {
        dataTransfer: {
          files: [
            new File([packageJson], "package.json", {
              type: "application/json",
            }),
          ],
        },
      });

      expect(await screen.findByText("package.json")).not.toBeNull();
      expect(
        (
          screen.getByRole("button", {
            name: /pré-visualizar/i,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    });

    it("JSON inválido mostra o erro do parser e não chama a API", async () => {
      const user = userEvent.setup();
      renderDrawer();

      await pasteAndPreview(user, '{ "dependencies": {');

      expect((await screen.findByRole("alert")).textContent).toMatch(
        /não é um JSON válido/i,
      );
      expect(importProjectLibraries).not.toHaveBeenCalled();
    });

    it("mais de 500 dependências é recusado antes de chamar a API", async () => {
      const user = userEvent.setup();
      renderDrawer();
      const dependencies = Object.fromEntries(
        Array.from({ length: 501 }, (_, i) => [`lib-${i}`, "1.0.0"]),
      );

      await pasteAndPreview(user, JSON.stringify({ dependencies }));

      expect((await screen.findByRole("alert")).textContent).toMatch(/500/);
      expect(importProjectLibraries).not.toHaveBeenCalled();
    });

    it("erro da API na prévia aparece e mantém a entrada", async () => {
      const user = userEvent.setup();
      vi.mocked(importProjectLibraries).mockRejectedValueOnce(
        new ImportProjectLibrariesError("Projeto não encontrado"),
      );
      renderDrawer();

      await pasteAndPreview(user);

      expect((await screen.findByRole("alert")).textContent).toMatch(
        /projeto não encontrado/i,
      );
      expect(
        screen.getByRole("textbox", { name: /conteúdo do package\.json/i }),
      ).not.toBeNull();
    });
  });

  describe("prévia", () => {
    it("agrupa dependencies e devDependencies, com a ação de cada linha e a versão anterior quando atualiza", async () => {
      const user = userEvent.setup();
      renderDrawer();
      await goToPreview(user);

      const deps = screen.getByRole("group", { name: "dependencies" });
      const dev = screen.getByRole("group", { name: "devDependencies" });

      expect(within(deps).getByText("next")).not.toBeNull();
      expect(within(deps).getByText("react")).not.toBeNull();
      expect(within(deps).getByText(/era \^18\.2\.0/)).not.toBeNull();
      expect(within(deps).getByText(/atualizar/i)).not.toBeNull();
      expect(within(dev).getByText("vitest")).not.toBeNull();
      expect(within(dev).getByText(/associar/i)).not.toBeNull();
      expect(within(dev).getAllByText(/^nova$/i)).toHaveLength(1);
    });

    it("linha 'sem mudança' aparece sem checkbox", async () => {
      const user = userEvent.setup();
      renderDrawer();
      await goToPreview(user);

      expect(
        within(screen.getByRole("group", { name: "dependencies" })).getByText(
          /sem mudança/i,
        ),
      ).not.toBeNull();
      expect(
        screen.queryByRole("checkbox", { name: /importar zod/i }),
      ).toBeNull();
      expect(
        screen.getByRole("checkbox", { name: /importar next/i }),
      ).not.toBeNull();
    });

    it("conflito de versão bloqueia o Importar até escolher; a escolha define a ação", async () => {
      const user = userEvent.setup();
      renderDrawer();
      await goToPreview(user);

      expect(screen.getByText(/versões diferentes/i)).not.toBeNull();
      expect(
        screen.getByText(/escolha a versão de 1 biblioteca/i),
      ).not.toBeNull();
      const importButton = screen.getByRole("button", { name: /^importar/i });
      expect((importButton as HTMLButtonElement).disabled).toBe(true);

      await user.click(screen.getByRole("radio", { name: /\^0\.45\.2/ }));

      expect(screen.queryByText(/escolha a versão de/i)).toBeNull();
      expect(
        (
          screen.getByRole("button", {
            name: /importar 5/i,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    });

    it("desmarcar o grupo devDependencies desmarca todas as linhas dele e atualiza a contagem", async () => {
      const user = userEvent.setup();
      renderDrawer();
      await goToPreview(user);
      await user.click(screen.getByRole("radio", { name: /\^0\.45\.2/ }));

      await user.click(
        screen.getByRole("checkbox", {
          name: /selecionar todas de devDependencies/i,
        }),
      );

      expect(
        screen
          .getByRole("checkbox", { name: /importar vitest/i })
          .getAttribute("aria-checked"),
      ).toBe("false");
      expect(
        screen.getByRole("button", { name: /importar 3/i }),
      ).not.toBeNull();
    });

    it("nada selecionado desabilita o Importar", async () => {
      const user = userEvent.setup();
      renderDrawer();
      await goToPreview(user);

      for (const group of ["dependencies", "devDependencies"]) {
        await user.click(
          screen.getByRole("checkbox", {
            name: new RegExp(`selecionar todas de ${group}`, "i"),
          }),
        );
      }

      expect(
        (
          screen.getByRole("button", {
            name: /^importar/i,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
    });

    it("Voltar retorna à entrada com o texto colado", async () => {
      const user = userEvent.setup();
      renderDrawer();
      await goToPreview(user);

      await user.click(screen.getByRole("button", { name: /voltar/i }));

      expect(
        (
          screen.getByRole("textbox", {
            name: /conteúdo do package\.json/i,
          }) as HTMLTextAreaElement
        ).value,
      ).toBe(packageJson);
    });

    it("falha ao importar (ex: 409) mostra a mensagem e mantém a prévia", async () => {
      const user = userEvent.setup();
      renderDrawer();
      await goToPreview(user);
      await user.click(screen.getByRole("radio", { name: /\^0\.45\.2/ }));
      vi.mocked(importProjectLibraries).mockRejectedValueOnce(
        new ImportProjectLibrariesError(
          "O catálogo ou o projeto mudou durante a importação — nada foi gravado, tente de novo",
        ),
      );

      await user.click(screen.getByRole("button", { name: /importar 5/i }));

      expect((await screen.findByRole("alert")).textContent).toMatch(
        /tente de novo/i,
      );
      expect(
        screen.getByRole("group", { name: "dependencies" }),
      ).not.toBeNull();
    });
  });

  describe("importação e relatório", () => {
    it("envia só as linhas marcadas (com a versão escolhida) e mostra o relatório", async () => {
      const user = userEvent.setup();
      const { invalidateSpy, onOpenChange } = renderDrawer();
      await goToPreview(user);
      await user.click(screen.getByRole("radio", { name: /\^0\.45\.2/ }));
      vi.mocked(importProjectLibraries).mockResolvedValueOnce(applied);

      await user.click(screen.getByRole("button", { name: /importar 5/i }));

      expect(importProjectLibraries).toHaveBeenLastCalledWith("project-1", {
        items: [
          { name: "next", version: "15.0.3" },
          { name: "react", version: "^18.3.1" },
          { name: "drizzle-orm", version: "^0.45.2" },
          { name: "vitest", version: "^3.2.0" },
          { name: "eslint", version: "^9.0.0" },
        ],
        dryRun: false,
      });
      expect(await screen.findByText("Importação concluída")).not.toBeNull();
      expect(
        screen.getByText(/5 bibliotecas importadas para DevLib/i),
      ).not.toBeNull();
      expect(screen.getByText(/novas no catálogo/i)).not.toBeNull();
      expect(screen.getByText(/versões atualizadas/i)).not.toBeNull();
      expect(screen.getByText("eslint")).not.toBeNull();

      for (const queryKey of [
        ["project-libraries", "project-1"],
        ["project-categories", "project-1"],
        ["libraries-overview"],
        ["projects-overview"],
        ["library-projects"],
      ]) {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
      }

      await user.click(screen.getByRole("button", { name: /fechar/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("relatório cita as que ficaram sem mudança", async () => {
      const user = userEvent.setup();
      renderDrawer();
      await goToPreview(user);
      await user.click(screen.getByRole("radio", { name: /\^0\.44\.0/ }));
      vi.mocked(importProjectLibraries).mockResolvedValueOnce({
        ...applied,
        summary: { create: 2, associate: 1, updateVersion: 1, unchanged: 0 },
        items: applied.items.filter((entry) => entry.name !== "drizzle-orm"),
      });

      await user.click(screen.getByRole("button", { name: /importar 4/i }));

      expect(
        await screen.findByText(/2 já estavam no projeto com a mesma versão/i),
      ).not.toBeNull();
    });
  });
});

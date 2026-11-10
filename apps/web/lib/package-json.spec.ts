import { describe, expect, it } from "vitest";
import { parsePackageJson } from "./package-json";

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function expectError(text: string, message: string | RegExp) {
  const result = parsePackageJson(text);

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toMatch(message);
  }
}

describe("parsePackageJson", () => {
  describe("sucesso", () => {
    it("lê dependencies e devDependencies — primeiro as de produção, cada grupo na ordem do arquivo", () => {
      const result = parsePackageJson(
        json({
          name: "meu-app",
          dependencies: { zod: "^3.25.0", react: "^18.3.1" },
          devDependencies: { vitest: "^3.2.0", eslint: "^9.0.0" },
        }),
      );

      expect(result).toEqual({
        ok: true,
        items: [
          {
            name: "zod",
            version: "^3.25.0",
            dev: false,
            sources: ["dependencies"],
          },
          {
            name: "react",
            version: "^18.3.1",
            dev: false,
            sources: ["dependencies"],
          },
          {
            name: "vitest",
            version: "^3.2.0",
            dev: true,
            sources: ["devDependencies"],
          },
          {
            name: "eslint",
            version: "^9.0.0",
            dev: true,
            sources: ["devDependencies"],
          },
        ],
      });
    });

    it("aceita só dependencies ou só devDependencies", () => {
      const onlyProd = parsePackageJson(
        json({ dependencies: { zod: "1.0.0" } }),
      );
      const onlyDev = parsePackageJson(
        json({ devDependencies: { vitest: "3.0.0" } }),
      );

      expect(onlyProd.ok && onlyProd.items.map((item) => item.name)).toEqual([
        "zod",
      ]);
      expect(onlyDev.ok && onlyDev.items.map((item) => item.dev)).toEqual([
        true,
      ]);
    });

    it("ignora peerDependencies, optionalDependencies e demais campos", () => {
      const result = parsePackageJson(
        json({
          dependencies: { zod: "^3.25.0" },
          peerDependencies: { react: "*" },
          optionalDependencies: { fsevents: "^2.3.0" },
          workspaces: ["apps/*"],
        }),
      );

      expect(result.ok && result.items.map((item) => item.name)).toEqual([
        "zod",
      ]);
    });

    it("mantém a versão como está no arquivo, sem normalizar (workspace:, file:, git, alias npm:)", () => {
      const result = parsePackageJson(
        json({
          dependencies: {
            "@devlib/db": "workspace:*",
            local: "file:../local",
            lib: "github:user/lib#main",
            alias: "npm:react@^18.3.1",
          },
        }),
      );

      expect(result.ok && result.items.map((item) => item.version)).toEqual([
        "workspace:*",
        "file:../local",
        "github:user/lib#main",
        "npm:react@^18.3.1",
      ]);
    });

    it("remove espaços nas pontas do nome e da versão", () => {
      const result = parsePackageJson(
        json({ dependencies: { " react ": "  ^18.3.1 " } }),
      );

      expect(result.ok && result.items[0]).toEqual({
        name: "react",
        version: "^18.3.1",
        dev: false,
        sources: ["dependencies"],
      });
    });

    it("versão vazia (ou só espaços) vira versão omitida — a API recusa string vazia", () => {
      const result = parsePackageJson(
        json({ dependencies: { react: "", zod: "   " } }),
      );

      expect(result.ok && result.items).toEqual([
        { name: "react", dev: false, sources: ["dependencies"] },
        { name: "zod", dev: false, sources: ["dependencies"] },
      ]);
      if (result.ok) {
        expect("version" in result.items[0]).toBe(false);
      }
    });

    it("aceita arquivo com BOM no início (comum em arquivo salvo no Windows)", () => {
      const result = parsePackageJson(
        String.fromCharCode(0xfeff) +
          json({ dependencies: { zod: "^3.25.0" } }),
      );

      expect(result.ok).toBe(true);
    });

    it("aceita espaços e quebras de linha em volta do JSON (texto colado)", () => {
      const result = parsePackageJson(
        `\n\n   ${json({ dependencies: { zod: "^3.25.0" } })}   \n`,
      );

      expect(result.ok).toBe(true);
    });
  });

  describe("mesma lib em dependencies e devDependencies", () => {
    it("com a mesma versão: uma linha só, de produção, com as duas origens", () => {
      const result = parsePackageJson(
        json({
          dependencies: { react: "^18.3.1" },
          devDependencies: { vitest: "^3.2.0", react: "^18.3.1" },
        }),
      );

      expect(result).toEqual({
        ok: true,
        items: [
          {
            name: "react",
            version: "^18.3.1",
            dev: false,
            sources: ["dependencies", "devDependencies"],
          },
          {
            name: "vitest",
            version: "^3.2.0",
            dev: true,
            sources: ["devDependencies"],
          },
        ],
      });
    });

    it("com versões diferentes: uma linha sem versão escolhida e com o conflito explícito", () => {
      const result = parsePackageJson(
        json({
          dependencies: { react: "^18.3.1" },
          devDependencies: { react: "^19.0.0" },
        }),
      );

      expect(result).toEqual({
        ok: true,
        items: [
          {
            name: "react",
            dev: false,
            sources: ["dependencies", "devDependencies"],
            conflict: { dependencies: "^18.3.1", devDependencies: "^19.0.0" },
          },
        ],
      });
      if (result.ok) {
        expect("version" in result.items[0]).toBe(false);
      }
    });

    it("versão vazia num grupo e preenchida no outro também é conflito (não escolhe sozinho)", () => {
      const result = parsePackageJson(
        json({
          dependencies: { react: "" },
          devDependencies: { react: "^19.0.0" },
        }),
      );

      expect(result.ok && result.items[0]).toEqual({
        name: "react",
        dev: false,
        sources: ["dependencies", "devDependencies"],
        conflict: { devDependencies: "^19.0.0" },
      });
    });

    it("compara o nome depois do trim", () => {
      const result = parsePackageJson(
        json({
          dependencies: { react: "^18.3.1" },
          devDependencies: { " react ": "^18.3.1" },
        }),
      );

      expect(result.ok && result.items).toHaveLength(1);
    });
  });

  describe("erros legíveis", () => {
    it("JSON inválido", () => {
      expectError("{ dependencies: ", /JSON válido/i);
    });

    it("texto vazio", () => {
      expectError("   ", /vazio/i);
    });

    it.each([
      ["array", "[]"],
      ["string", '"react"'],
      ["número", "42"],
      ["null", "null"],
    ])("conteúdo que não é objeto (%s)", (_case, text) => {
      expectError(text, /não parece um package\.json/i);
    });

    it.each([
      ["dependencies", { dependencies: ["react"] }],
      ["devDependencies", { devDependencies: "vitest" }],
      ["dependencies", { dependencies: null }],
    ])("%s que não é objeto cita o campo", (field, value) => {
      expectError(json(value), new RegExp(`"${field}"`));
    });

    it.each([
      ["número", 18],
      ["null", null],
      ["objeto", { version: "1.0.0" }],
    ])(
      "versão que não é string (%s) cita a lib e o grupo",
      (_case, version) => {
        expectError(
          json({ devDependencies: { react: version } }),
          /"react".*devDependencies/,
        );
      },
    );

    it("nome vazio (ou só espaços) cita o grupo", () => {
      expectError(json({ dependencies: { "  ": "1.0.0" } }), /dependencies/);
    });

    it("mesmo nome duas vezes no mesmo grupo (só diferindo por espaços) cita a lib", () => {
      expectError(
        json({ dependencies: { react: "^18.3.1", " react": "^19.0.0" } }),
        /"react".*repetid/,
      );
    });

    it("sem nenhuma dependência", () => {
      expectError(json({ name: "meu-app" }), /nenhuma dependência/i);
      expectError(
        json({ dependencies: {}, devDependencies: {} }),
        /nenhuma dependência/i,
      );
    });
  });
});

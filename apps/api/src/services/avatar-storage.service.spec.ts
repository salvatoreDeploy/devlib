import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createAvatarStorage,
  InvalidFileTypeError,
} from "./avatar-storage.service";

let uploadDir: string;

beforeEach(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), "devlib-avatars-"));
});

afterEach(async () => {
  await rm(uploadDir, { recursive: true, force: true });
});

describe("createAvatarStorage", () => {
  describe("saveAvatarFile", () => {
    it("grava o arquivo em disco e retorna a URL pública com extensão derivada do mimetype", async () => {
      const storage = createAvatarStorage(uploadDir);
      const buffer = Buffer.from("conteúdo-fake-da-imagem");

      const result = await storage.saveAvatarFile(buffer, "image/png");

      expect(result.url).toMatch(/^\/uploads\/avatars\/[\w-]+\.png$/);
      const filename = result.url.split("/").pop() as string;
      const written = await readFile(path.join(uploadDir, filename));
      expect(written).toEqual(buffer);
    });

    it("aceita image/jpeg e image/webp", async () => {
      const storage = createAvatarStorage(uploadDir);

      const jpeg = await storage.saveAvatarFile(Buffer.from("a"), "image/jpeg");
      expect(jpeg.url).toMatch(/\.jpg$/);

      const webp = await storage.saveAvatarFile(Buffer.from("a"), "image/webp");
      expect(webp.url).toMatch(/\.webp$/);
    });

    it("lança InvalidFileTypeError para mimetype não suportado", async () => {
      const storage = createAvatarStorage(uploadDir);

      await expect(
        storage.saveAvatarFile(Buffer.from("a"), "application/pdf"),
      ).rejects.toThrow(InvalidFileTypeError);
    });

    it("cria o diretório de upload se ele ainda não existir", async () => {
      const nestedDir = path.join(uploadDir, "nested", "avatars");
      const storage = createAvatarStorage(nestedDir);

      const result = await storage.saveAvatarFile(
        Buffer.from("a"),
        "image/png",
      );

      const filename = result.url.split("/").pop() as string;
      await expect(
        readFile(path.join(nestedDir, filename)),
      ).resolves.toBeDefined();
    });

    it("gera nomes diferentes pra uploads diferentes (sem colisão)", async () => {
      const storage = createAvatarStorage(uploadDir);

      const first = await storage.saveAvatarFile(Buffer.from("a"), "image/png");
      const second = await storage.saveAvatarFile(
        Buffer.from("b"),
        "image/png",
      );

      expect(first.url).not.toBe(second.url);
    });
  });

  describe("deleteAvatarFile", () => {
    it("apaga o arquivo existente", async () => {
      const storage = createAvatarStorage(uploadDir);
      const { url } = await storage.saveAvatarFile(
        Buffer.from("a"),
        "image/png",
      );
      const filename = url.split("/").pop() as string;

      await storage.deleteAvatarFile(url);

      await expect(readFile(path.join(uploadDir, filename))).rejects.toThrow();
    });

    it("não lança erro quando o arquivo já não existe", async () => {
      const storage = createAvatarStorage(uploadDir);

      await expect(
        storage.deleteAvatarFile("/uploads/avatars/id-inexistente.png"),
      ).resolves.not.toThrow();
    });

    it("ignora o caminho e usa só o nome do arquivo, dentro do uploadDir configurado", async () => {
      await mkdir(uploadDir, { recursive: true });
      const outsideFile = path.join(uploadDir, "..", "nao-deveria-sumir.txt");
      await writeFile(outsideFile, "protegido");
      const storage = createAvatarStorage(uploadDir);

      await storage.deleteAvatarFile(
        "/uploads/avatars/../../nao-deveria-sumir.txt",
      );

      await expect(readFile(outsideFile)).resolves.toBeDefined();
      await rm(outsideFile);
    });
  });
});

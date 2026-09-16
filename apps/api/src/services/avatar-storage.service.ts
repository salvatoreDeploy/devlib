import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const AVATAR_URL_PREFIX = "/uploads/avatars";

export const DEFAULT_AVATAR_UPLOAD_DIR = path.resolve(
  __dirname,
  "../../uploads/avatars",
);

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export class InvalidFileTypeError extends Error {
  constructor(mimetype: string) {
    super(`Tipo de arquivo não suportado: ${mimetype}`);
    this.name = "InvalidFileTypeError";
  }
}

export type AvatarStorage = {
  saveAvatarFile(buffer: Buffer, mimetype: string): Promise<{ url: string }>;
  deleteAvatarFile(url: string): Promise<void>;
};

export function createAvatarStorage(
  uploadDir: string = DEFAULT_AVATAR_UPLOAD_DIR,
): AvatarStorage {
  return {
    async saveAvatarFile(buffer, mimetype) {
      const extension = ALLOWED_MIME_TYPES[mimetype];

      if (!extension) {
        throw new InvalidFileTypeError(mimetype);
      }

      await mkdir(uploadDir, { recursive: true });
      const filename = `${randomUUID()}.${extension}`;
      await writeFile(path.join(uploadDir, filename), buffer);

      return { url: `${AVATAR_URL_PREFIX}/${filename}` };
    },

    async deleteAvatarFile(url) {
      const filename = path.basename(url);

      try {
        await unlink(path.join(uploadDir, filename));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    },
  };
}

import { describe, it, expect, vi } from "vitest";
import { seedCategories, PREDEFINED_CATEGORIES } from "./seed";
import { categories } from "./schema";

describe("seedCategories", () => {
  it("insere todas as categorias predefinidas numa única chamada", async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const insert = vi.fn().mockReturnValue({ values });

    await seedCategories({ insert });

    expect(insert).toHaveBeenCalledWith(categories);
    expect(values).toHaveBeenCalledWith(
      PREDEFINED_CATEGORIES.map((name) => ({ name })),
    );
  });

  it("usa onConflictDoNothing para ser idempotente (rodar de novo não duplica nem quebra)", async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const insert = vi.fn().mockReturnValue({ values });

    await seedCategories({ insert });

    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
  });
});

describe("PREDEFINED_CATEGORIES", () => {
  it("não tem nomes duplicados", () => {
    expect(new Set(PREDEFINED_CATEGORIES).size).toBe(
      PREDEFINED_CATEGORIES.length,
    );
  });
});

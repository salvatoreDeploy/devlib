import path from "node:path";
import { config } from "dotenv";
import { categories } from "./schema";
import { createDb, getDatabaseUrl } from "./client";

export const PREDEFINED_CATEGORIES = [
  "Frontend",
  "Backend",
  "Database",
  "Testing",
  "DevOps",
  "Mobile",
  "State Management",
  "Autenticação",
  "Build Tools",
  "Utilitários",
] as const;

type SeedDb = {
  insert: (table: typeof categories) => {
    values: (data: { name: string }[]) => {
      onConflictDoNothing: () => Promise<unknown>;
    };
  };
};

export async function seedCategories(db: SeedDb): Promise<void> {
  await db
    .insert(categories)
    .values(PREDEFINED_CATEGORIES.map((name) => ({ name })))
    .onConflictDoNothing();
}

if (require.main === module) {
  config({ path: path.resolve(__dirname, "../../../.env") });

  seedCategories(createDb(getDatabaseUrl()))
    .then(() => {
      console.log("Categorias predefinidas inseridas com sucesso.");
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}

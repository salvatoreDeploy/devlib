import { resolveTestDatabaseUrl } from "./test-database-url";
import { ensureTestDatabase, migrateTestDatabase } from "./test-db";

// roda uma vez antes da suíte: cria o banco _test se faltar e aplica as
// migrations de packages/db/drizzle (as mesmas do db:migrate)
export default async function setup() {
  const url = resolveTestDatabaseUrl();

  await ensureTestDatabase(url);
  await migrateTestDatabase(url);
}

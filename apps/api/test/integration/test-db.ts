import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { categories, createDb, projects, users } from "@devlib/db";
import {
  getDatabaseName,
  getMaintenanceDatabaseUrl,
  resolveTestDatabaseUrl,
} from "./test-database-url";

export type TestDb = ReturnType<typeof createDb>;

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../../packages/db/drizzle", import.meta.url),
);

export async function ensureTestDatabase(url: string): Promise<void> {
  const name = getDatabaseName(url);
  const maintenance = createDb(getMaintenanceDatabaseUrl(url));

  try {
    const result = await maintenance.execute(
      sql`SELECT 1 FROM pg_database WHERE datname = ${name}`,
    );

    if (result.rowCount === 0) {
      // nome já validado por getDatabaseName ([a-z0-9_]) — seguro em sql.raw
      await maintenance.execute(sql.raw(`CREATE DATABASE "${name}"`));
    }
  } finally {
    await maintenance.$client.end();
  }
}

export async function migrateTestDatabase(url: string): Promise<void> {
  const db = createDb(url);

  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await db.$client.end();
  }
}

export async function truncateAllTables(db: TestDb): Promise<void> {
  const result = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const tables = result.rows.map((row) => `"${row.tablename}"`);

  if (tables.length > 0) {
    await db.execute(
      sql.raw(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`),
    );
  }
}

let testDb: TestDb | undefined;

// conexão compartilhada pelos specs do mesmo arquivo (fechada no afterAll
// de setup.ts) — as rotas abrem a própria conexão via DATABASE_URL
export function getTestDb(): TestDb {
  testDb ??= createDb(resolveTestDatabaseUrl());

  return testDb;
}

export async function closeTestDb(): Promise<void> {
  await testDb?.$client.end();
  testDb = undefined;
}

// drizzle-orm >= 0.44 embrulha o erro do driver em DrizzleQueryError
// (código do Postgres fica em `cause`)
export function pgErrorCode(error: unknown): string | undefined {
  const candidate = error as { code?: string; cause?: { code?: string } };

  return candidate?.code ?? candidate?.cause?.code;
}

export async function insertUser(email: string) {
  const [row] = await getTestDb()
    .insert(users)
    .values({ email, passwordHash: "hash" })
    .returning();

  return row;
}

export async function insertProject(userId: string, name: string) {
  const [row] = await getTestDb()
    .insert(projects)
    .values({ userId, name })
    .returning();

  return row;
}

export async function insertGlobalCategory(name: string) {
  const [row] = await getTestDb()
    .insert(categories)
    .values({ projectId: null, name })
    .returning();

  return row;
}

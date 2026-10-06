import { afterAll, beforeEach } from "vitest";
import { resolveTestDatabaseUrl } from "./test-database-url";
import { closeTestDb, getTestDb, truncateAllTables } from "./test-db";

// sobrescreve (não herda) DATABASE_URL: as rotas, sem repositório injetado,
// conectam via getDatabaseUrl() — aqui isso sempre aponta pro banco _test
process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.JWT_SECRET = "integration-test-secret";
process.env.JWT_REFRESH_SECRET = "integration-test-refresh-secret";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

beforeEach(async () => {
  await truncateAllTables(getTestDb());
});

afterAll(async () => {
  await closeTestDb();
});

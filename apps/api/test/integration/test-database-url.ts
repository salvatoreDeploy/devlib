// A suíte de integração apaga (TRUNCATE) todas as tabelas antes de cada
// teste. Por isso ela nunca lê DATABASE_URL (que aponta pro banco de
// desenvolvimento) — só TEST_DATABASE_URL, e só aceita bancos com sufixo
// `_test`.
export const DEFAULT_TEST_DATABASE_URL =
  "postgresql://devlib:devlib@localhost:5432/devlib_test";

const SAFE_DATABASE_NAME = /^[a-z0-9_]+$/;

export function getDatabaseName(url: string): string {
  const name = decodeURIComponent(new URL(url).pathname.slice(1));

  if (!SAFE_DATABASE_NAME.test(name)) {
    throw new Error(
      `Nome de banco de teste inválido: "${name}" (use só [a-z0-9_])`,
    );
  }

  return name;
}

export function resolveTestDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const url = env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const name = getDatabaseName(url);

  if (!name.endsWith("_test")) {
    throw new Error(
      `TEST_DATABASE_URL precisa apontar pra um banco com sufixo "_test" (recebido: "${name}") — a suíte de integração apaga todos os dados do banco a cada teste.`,
    );
  }

  return url;
}

export function getMaintenanceDatabaseUrl(url: string): string {
  const parsed = new URL(url);
  parsed.pathname = "/postgres";

  return parsed.toString();
}

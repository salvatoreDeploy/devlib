import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

const DATABASE_URL_PATTERN =
  /^postgres(ql)?:\/\/[^:@/]+:[^@/]+@[^:@/]+:\d+\/[^?#]+$/;

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(
      DATABASE_URL_PATTERN,
      "deve seguir o formato postgresql://usuario:senha@host:porta/banco",
    ),
});

export function getDatabaseUrl(): string {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    throw new Error(`DATABASE_URL inválida ou não definida: ${issue.message}`);
  }

  return parsed.data.DATABASE_URL;
}

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });

  return drizzle(pool);
}

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL não definida");
  }

  return url;
}

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });

  return drizzle(pool);
}

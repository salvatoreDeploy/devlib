import { z } from "zod";

const corsEnvSchema = z.object({
  WEB_URL: z.string().url().default("http://localhost:3000"),
});

export type CorsConfig = {
  webUrl: string;
};

export function getCorsConfig(): CorsConfig {
  const parsed = corsEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    throw new Error(
      `Configuração de CORS inválida: ${issue.path.join(".")} — ${issue.message}`,
    );
  }

  return { webUrl: parsed.data.WEB_URL };
}

const authEnvSchema = z.object({
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1),
});

export type AuthConfig = {
  jwtSecret: string;
  jwtRefreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
};

export function getAuthConfig(): AuthConfig {
  const parsed = authEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    throw new Error(
      `Configuração de autenticação inválida: ${issue.path.join(".")} — ${issue.message}`,
    );
  }

  return {
    jwtSecret: parsed.data.JWT_SECRET,
    jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessExpiresIn: parsed.data.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  };
}

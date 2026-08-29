import { z } from "zod";

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

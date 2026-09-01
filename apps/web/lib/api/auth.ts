export type LoginInput = {
  email: string;
  password: string;
};

export type LoginTokens = {
  accessToken: string;
  refreshToken: string;
};

export class LoginError extends Error {}

export async function login(input: LoginInput): Promise<LoginTokens> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new LoginError(body.error ?? "Não foi possível entrar");
  }

  return body;
}

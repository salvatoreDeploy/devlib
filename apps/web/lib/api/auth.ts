export type LoginInput = {
  email: string;
  password: string;
};

export type LoginTokens = {
  accessToken: string;
  refreshToken: string;
};

export class LoginError extends Error {}
export class RefreshSessionError extends Error {}
export class LogoutError extends Error {}

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

// fetch cru de propósito: passar por authenticatedFetch recursaria (ele chama refreshSession no 401).
export async function refreshSession(
  refreshToken: string,
): Promise<LoginTokens> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new RefreshSessionError(
      body.error ?? "Não foi possível renovar a sessão",
    );
  }

  return body;
}

// fetch cru de propósito: /auth/logout não exige Bearer (o refresh token já
// prova a posse da sessão), mesmo raciocínio de refreshSession acima.
export async function logout(refreshToken: string): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    },
  );

  if (!response.ok) {
    const body = await response.json();
    throw new LogoutError(body.error ?? "Não foi possível encerrar a sessão");
  }
}

import { authenticatedFetch } from "./http-client";

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export class GetCurrentUserError extends Error {}

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await authenticatedFetch("/users/me");

  const body = await response.json();

  if (!response.ok) {
    throw new GetCurrentUserError(
      body.error ?? "Não foi possível buscar o perfil",
    );
  }

  return body;
}

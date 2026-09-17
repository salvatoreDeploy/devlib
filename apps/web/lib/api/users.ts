import { authenticatedFetch } from "./http-client";

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateCurrentUserInput = {
  name?: string;
  email?: string;
  password?: string;
  currentPassword?: string;
};

export class GetCurrentUserError extends Error {}
export class UpdateCurrentUserError extends Error {}
export class UploadAvatarError extends Error {}

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

export async function updateCurrentUser(
  input: UpdateCurrentUserInput,
): Promise<UserProfile> {
  const response = await authenticatedFetch("/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new UpdateCurrentUserError(
      body.error ?? "Não foi possível atualizar o perfil",
    );
  }

  return body;
}

export async function uploadAvatar(file: File): Promise<UserProfile> {
  const formData = new FormData();
  formData.append("photo", file);

  const response = await authenticatedFetch("/users/me/photo", {
    method: "POST",
    body: formData,
  });

  const body = await response.json();

  if (!response.ok) {
    throw new UploadAvatarError(body.error ?? "Não foi possível enviar a foto");
  }

  return body;
}

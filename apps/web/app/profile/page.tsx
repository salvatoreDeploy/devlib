"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check, Upload } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/header";
import {
  getCurrentUser,
  GetCurrentUserError,
  updateCurrentUser,
  UpdateCurrentUserError,
  uploadAvatar,
  UploadAvatarError,
  type UpdateCurrentUserInput,
} from "@/lib/api/users";
import { clearTokens } from "@/lib/auth-storage";
import { getInitials } from "@/lib/initials";
import { useRequireAuth } from "@/lib/use-require-auth";

const profileFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  currentPassword: z.string(),
  newPassword: z.string().refine((value) => value === "" || value.length >= 8, {
    message: "Mínimo de 8 caracteres",
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type AvatarPreviewProps = {
  avatarUrl: string | null;
  initials: string;
};

// key={avatarUrl} no chamador remonta este componente (e reseta `failed`)
// sempre que a URL muda — ex: depois de um upload novo bem-sucedido.
function AvatarPreview({ avatarUrl, initials }: AvatarPreviewProps) {
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${process.env.NEXT_PUBLIC_API_URL}${avatarUrl}`}
        alt="Foto de perfil"
        className="size-[104px] rounded-full border border-checkbox-border object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex size-[104px] items-center justify-center rounded-full border border-checkbox-border bg-track">
      <span className="text-[28px] font-bold text-text-dim">{initials}</span>
    </div>
  );
}

export default function ProfilePage() {
  const isAuthenticated = useRequireAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: profileQuery.data
      ? {
          name: profileQuery.data.name ?? "",
          email: profileQuery.data.email,
          currentPassword: "",
          newPassword: "",
        }
      : undefined,
  });

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (updated) => {
      queryClient.setQueryData(["currentUser"], updated);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateCurrentUserInput) => updateCurrentUser(input),
    onSuccess: (updated, variables) => {
      if (variables.password) {
        clearTokens();
        router.push("/login");
        return;
      }
      queryClient.setQueryData(["currentUser"], updated);
      setSuccessMessage("Perfil atualizado.");
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      avatarMutation.mutate(file);
    }
  }

  function onSubmit(data: ProfileFormValues) {
    if (!profileQuery.data) {
      return;
    }
    setSuccessMessage(null);

    const payload: UpdateCurrentUserInput = {};
    if (data.name !== profileQuery.data.name) {
      payload.name = data.name;
    }
    if (data.email !== profileQuery.data.email) {
      payload.email = data.email;
    }
    if (data.newPassword) {
      payload.password = data.newPassword;
    }

    if (payload.email || payload.password) {
      if (!data.currentPassword) {
        setError("currentPassword", {
          message: "Informe a senha atual pra trocar e-mail ou senha",
        });
        return;
      }
      payload.currentPassword = data.currentPassword;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    updateMutation.mutate(payload);
  }

  if (!isAuthenticated) {
    return null;
  }

  if (profileQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-10">
        <p className="text-[13px] text-muted-foreground">carregando...</p>
      </main>
    );
  }

  if (profileQuery.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-10">
        <p className="text-[13px] text-destructive">
          {profileQuery.error instanceof GetCurrentUserError
            ? profileQuery.error.message
            : "Não foi possível carregar o perfil."}
        </p>
      </main>
    );
  }

  const profile = profileQuery.data;

  if (!profile) {
    return null;
  }

  const avatarUrl = avatarMutation.data?.avatarUrl ?? profile.avatarUrl;
  const initials = getInitials(profile.name, profile.email);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-10 py-[32px] pb-[60px]">
        <div className="mb-[26px]">
          <h1 className="mb-2 text-[21px] font-bold tracking-[-0.015em] text-foreground">
            Atualizar perfil
          </h1>
          <p className="max-w-[620px] text-[13.5px] leading-[1.6] text-muted-foreground">
            Gerencie sua foto, informações pessoais e senha da conta.
          </p>
        </div>

        <form
          className="grid grid-cols-[360px_1fr] gap-6"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-[18px] rounded-[11px] border border-border bg-card p-5">
            <h2 className="text-[14px] font-semibold text-secondary-foreground">
              Foto de perfil
            </h2>

            <label
              htmlFor="avatar-upload"
              className="flex h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[11px] border border-input bg-surface-input p-[22px] text-center"
            >
              <input
                ref={fileInputRef}
                id="avatar-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleFileChange}
              />
              <AvatarPreview
                key={avatarUrl ?? "sem-foto"}
                avatarUrl={avatarUrl}
                initials={initials}
              />
              <Upload className="size-[18px] text-primary" aria-hidden="true" />
              <span className="text-[13px] font-semibold text-foreground">
                {avatarMutation.isPending ? "enviando..." : "Enviar nova foto"}
              </span>
              <p className="text-[12.5px] leading-[1.45] text-text-faint">
                PNG, JPG ou WEBP até 2MB. Use uma imagem quadrada para melhor
                resultado.
              </p>
            </label>

            <Button
              type="button"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload />
              Carregar foto
            </Button>

            {avatarMutation.isError && (
              <p className="text-xs text-destructive">
                {avatarMutation.error instanceof UploadAvatarError
                  ? avatarMutation.error.message
                  : "Não foi possível enviar a foto."}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-[18px] rounded-[11px] border border-border bg-card p-5">
              <h2 className="text-[14px] font-semibold text-secondary-foreground">
                Informações pessoais
              </h2>

              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-[7px]">
                  <Label
                    htmlFor="name"
                    className="text-[12.5px] font-medium text-secondary-foreground"
                  >
                    Nome completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    aria-invalid={errors.name ? true : undefined}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-[7px]">
                  <Label
                    htmlFor="email"
                    className="text-[12.5px] font-medium text-secondary-foreground"
                  >
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    aria-invalid={errors.email ? true : undefined}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[18px] rounded-[11px] border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-secondary-foreground">
                  Segurança
                </h2>
                <span className="text-[12.5px] text-text-fainter">
                  Alterar senha é opcional
                </span>
              </div>

              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-[7px]">
                  <Label
                    htmlFor="currentPassword"
                    className="text-[12.5px] font-medium text-secondary-foreground"
                  >
                    Senha atual
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    aria-invalid={errors.currentPassword ? true : undefined}
                    {...register("currentPassword")}
                  />
                  {errors.currentPassword && (
                    <p className="text-xs text-destructive">
                      {errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-[7px]">
                  <Label
                    htmlFor="newPassword"
                    className="text-[12.5px] font-medium text-secondary-foreground"
                  >
                    Nova senha
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    aria-invalid={errors.newPassword ? true : undefined}
                    {...register("newPassword")}
                  />
                  {errors.newPassword && (
                    <p className="text-xs text-destructive">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {updateMutation.isError && (
              <p className="text-xs text-destructive">
                {updateMutation.error instanceof UpdateCurrentUserError
                  ? updateMutation.error.message
                  : "Não foi possível atualizar o perfil. Tente novamente."}
              </p>
            )}

            {successMessage && (
              <p className="text-xs text-primary">{successMessage}</p>
            )}

            <div className="flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                <Check />
                {updateMutation.isPending ? "salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

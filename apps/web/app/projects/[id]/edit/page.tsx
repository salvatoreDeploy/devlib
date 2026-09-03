"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getProject,
  GetProjectError,
  updateProject,
  UpdateProjectError,
} from "../../../../lib/api/projects";
import { getAccessToken } from "../../../../lib/auth-storage";
import { useRequireAuth } from "../../../../lib/use-require-auth";

const editProjectFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

type EditProjectFormValues = z.infer<typeof editProjectFormSchema>;

export default function EditProjectPage() {
  const isAuthenticated = useRequireAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id, getAccessToken() ?? ""),
    enabled: isAuthenticated,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectFormSchema),
    values: projectQuery.data
      ? {
          name: projectQuery.data.name,
          description: projectQuery.data.description ?? "",
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: EditProjectFormValues) =>
      updateProject(id, data, getAccessToken() ?? ""),
    onSuccess: () => {
      router.push("/");
    },
  });

  if (!isAuthenticated) {
    return null;
  }

  if (projectQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-10">
        <p className="text-[13px] text-muted-foreground">carregando...</p>
      </main>
    );
  }

  if (projectQuery.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-10">
        <p className="text-[13px] text-destructive">
          {projectQuery.error instanceof GetProjectError
            ? projectQuery.error.message
            : "Não foi possível carregar o projeto."}
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-10">
      <form
        className="flex w-[432px] flex-col gap-[18px] rounded-xl border border-border bg-card p-[26px_28px]"
        noValidate
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
      >
        <div>
          <h1 className="mb-1.5 text-[19px] font-bold tracking-[-0.015em] text-foreground">
            Editar projeto
          </h1>
          <p className="text-[13px] leading-[1.6] text-muted-foreground">
            Atualize o nome ou a descrição do projeto.
          </p>
        </div>

        <div className="flex flex-col gap-[7px]">
          <Label
            htmlFor="name"
            className="text-[12.5px] font-medium text-secondary-foreground"
          >
            Nome do projeto
          </Label>
          <Input
            id="name"
            type="text"
            className="h-10 rounded-lg border-input bg-surface-input px-3 text-[13.5px] text-foreground"
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-[7px]">
          <Label
            htmlFor="description"
            className="text-[12.5px] font-medium text-secondary-foreground"
          >
            Descrição
          </Label>
          <Input
            id="description"
            type="text"
            className="h-10 rounded-lg border-input bg-surface-input px-3 text-[13.5px] text-foreground"
            {...register("description")}
          />
        </div>

        {mutation.isError && (
          <p className="text-xs text-destructive">
            {mutation.error instanceof UpdateProjectError
              ? mutation.error.message
              : "Não foi possível atualizar o projeto. Tente novamente."}
          </p>
        )}

        <div className="flex justify-end gap-2.5">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-auto rounded-lg px-[15px] py-2.5 text-[13px] font-semibold"
          >
            <Check />
            {mutation.isPending ? "salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </main>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, CreateProjectError } from "../../../lib/api/projects";
import { getAccessToken } from "../../../lib/auth-storage";
import { useRequireAuth } from "../../../lib/use-require-auth";

const newProjectFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

type NewProjectFormValues = z.infer<typeof newProjectFormSchema>;

export default function NewProjectPage() {
  const isAuthenticated = useRequireAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewProjectFormValues>({
    resolver: zodResolver(newProjectFormSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: NewProjectFormValues) =>
      createProject(data, getAccessToken() ?? ""),
    onSuccess: () => {
      router.push("/");
    },
  });

  if (!isAuthenticated) {
    return null;
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
            Criar projeto
          </h1>
          <p className="text-[13px] leading-[1.6] text-muted-foreground">
            Cada projeto tem seu próprio catálogo de bibliotecas e versões.
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
            placeholder="DevLib App"
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
            placeholder="pra que serve esse projeto"
            className="h-10 rounded-lg border-input bg-surface-input px-3 text-[13.5px] text-foreground"
            {...register("description")}
          />
        </div>

        {mutation.isError && (
          <p className="text-xs text-destructive">
            {mutation.error instanceof CreateProjectError
              ? mutation.error.message
              : "Não foi possível criar o projeto. Tente novamente."}
          </p>
        )}

        <div className="flex justify-end gap-2.5">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-auto rounded-lg px-[15px] py-2.5 text-[13px] font-semibold"
          >
            <Check />
            {mutation.isPending ? "criando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </main>
  );
}

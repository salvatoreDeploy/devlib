"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowUpRight } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        className="w-full max-w-xs rounded-lg border border-border bg-card p-6"
        noValidate
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
      >
        <h1 className="mb-4 text-base font-semibold">Novo projeto</h1>

        <div className="mb-3">
          <Label
            htmlFor="name"
            className="mb-1 block text-[11px] font-normal text-muted-foreground"
          >
            Nome
          </Label>
          <Input
            id="name"
            type="text"
            className="h-8 text-xs"
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="mb-4">
          <Label
            htmlFor="description"
            className="mb-1 block text-[11px] font-normal text-muted-foreground"
          >
            Descrição
          </Label>
          <Input
            id="description"
            type="text"
            className="h-8 text-xs"
            {...register("description")}
          />
        </div>

        {mutation.isError && (
          <p className="mb-3 text-xs text-destructive">
            {mutation.error instanceof CreateProjectError
              ? mutation.error.message
              : "Não foi possível criar o projeto. Tente novamente."}
          </p>
        )}

        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? (
            "criando..."
          ) : (
            <>
              criar projeto
              <ArrowUpRight />
            </>
          )}
        </Button>
      </form>
    </main>
  );
}

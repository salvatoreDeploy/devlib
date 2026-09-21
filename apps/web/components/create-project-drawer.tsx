"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createProject,
  CreateProjectError,
  Project,
} from "../lib/api/projects";

const createProjectFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

type CreateProjectDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: Project) => void;
};

export function CreateProjectDrawer({
  open,
  onOpenChange,
  onCreated,
}: CreateProjectDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectFormSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: CreateProjectFormValues) => createProject(data),
    onSuccess: (project) => {
      reset();
      onCreated(project);
    },
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset();
          mutation.reset();
        }
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent>
        <form
          className="flex h-full flex-col gap-4.5"
          noValidate
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
        >
          <SheetHeader>
            <SheetTitle>Criar projeto</SheetTitle>
            <SheetDescription>
              Cada projeto tem seu próprio catálogo de bibliotecas e versões.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-[7px]">
            <Label
              htmlFor="create-project-name"
              className="text-[12.5px] font-medium text-secondary-foreground"
            >
              Nome do projeto
            </Label>
            <Input
              id="create-project-name"
              type="text"
              placeholder="DevLib App"
              aria-invalid={errors.name ? true : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-[7px]">
            <Label
              htmlFor="create-project-description"
              className="text-[12.5px] font-medium text-secondary-foreground"
            >
              Descrição
            </Label>
            <Input
              id="create-project-description"
              type="text"
              placeholder="pra que serve esse projeto"
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

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </SheetClose>
            <Button type="submit" disabled={mutation.isPending}>
              <Check />
              {mutation.isPending ? "salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

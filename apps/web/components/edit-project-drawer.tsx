"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  updateProject,
  UpdateProjectError,
  type Project,
} from "../lib/api/projects";

// Edição de projeto em drawer (irmão do "Criar projeto") — substitui a página
// /projects/[id]/edit. Aberto pelo "Editar" do "···" do ProjectCard.

const editProjectFormSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

type EditProjectFormValues = z.infer<typeof editProjectFormSchema>;

type EditProjectDrawerProps = {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
};

export function EditProjectDrawer({
  project,
  onOpenChange,
}: EditProjectDrawerProps) {
  return (
    <Sheet open={project !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* hooks só com o drawer aberto; key: recomeça dos valores atuais */}
        {project && (
          <EditProjectForm
            key={project.id}
            project={project}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditProjectForm({
  project,
  onSaved,
}: {
  project: Project;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectFormSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
    },
  });

  const mutation = useMutation({
    // a API ainda não aceita apagar a descrição (min(1), sem null): vazia não
    // é enviada e a antiga fica — antes a página mandava "" e levava 400
    mutationFn: (data: EditProjectFormValues) =>
      updateProject(project.id, {
        name: data.name,
        ...(data.description?.trim() ? { description: data.description } : {}),
      }),
    onSuccess: () => {
      // cards da Home e de /projects
      queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      // select de projetos do drawer da biblioteca
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      // "Usada em" mostra o nome do projeto
      queryClient.invalidateQueries({ queryKey: ["library-projects"] });
      onSaved();
    },
  });

  return (
    <form
      className="flex h-full flex-col gap-4.5"
      noValidate
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
    >
      <SheetHeader>
        <SheetTitle>Editar projeto</SheetTitle>
        <SheetDescription>Nome e descrição de {project.name}.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-[7px]">
        <Label
          htmlFor="edit-project-name"
          className="text-[12.5px] font-medium text-secondary-foreground"
        >
          Nome do projeto
        </Label>
        <Input
          id="edit-project-name"
          type="text"
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-[7px]">
        <Label
          htmlFor="edit-project-description"
          className="text-[12.5px] font-medium text-secondary-foreground"
        >
          Descrição
        </Label>
        <Input
          id="edit-project-description"
          type="text"
          placeholder="pra que serve esse projeto"
          {...register("description")}
        />
        <p className="text-xs text-text-faint">
          Ainda não dá pra apagar a descrição — só trocar.
        </p>
      </div>

      {mutation.isError && (
        <p role="alert" className="text-xs text-destructive">
          {mutation.error instanceof UpdateProjectError
            ? mutation.error.message
            : "Não foi possível salvar o projeto. Tente novamente."}
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
  );
}

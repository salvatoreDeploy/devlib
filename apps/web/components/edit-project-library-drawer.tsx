"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  updateProjectLibrary,
  UpdateProjectLibraryError,
  type ProjectLibrary,
  type UpdateProjectLibraryInput,
} from "../lib/api/projects";
import { getProjectCategories } from "../lib/api/categories";

// Radix Select não aceita item com value "" — o padrão da biblioteca
// (categoryId null na associação) vira esse valor só dentro do form
const LIBRARY_DEFAULT = "library-default";

const editProjectLibraryFormSchema = z.object({
  categoryId: z.string(),
  version: z
    .string()
    .trim()
    .max(100, "A versão deve ter no máximo 100 caracteres"),
});

type EditProjectLibraryFormValues = z.infer<
  typeof editProjectLibraryFormSchema
>;

type EditProjectLibraryDrawerProps = {
  projectId: string;
  projectName: string;
  library: ProjectLibrary | null;
  onOpenChange: (open: boolean) => void;
};

export function EditProjectLibraryDrawer({
  projectId,
  projectName,
  library,
  onOpenChange,
}: EditProjectLibraryDrawerProps) {
  return (
    <Sheet open={library !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* key: o form recomeça dos valores atuais ao trocar de biblioteca */}
        {library && (
          <EditProjectLibraryForm
            key={library.id}
            projectId={projectId}
            projectName={projectName}
            library={library}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type EditProjectLibraryFormProps = {
  projectId: string;
  projectName: string;
  library: ProjectLibrary;
  onSaved: () => void;
};

function EditProjectLibraryForm({
  projectId,
  projectName,
  library,
  onSaved,
}: EditProjectLibraryFormProps) {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["project-categories", projectId],
    queryFn: () => getProjectCategories(projectId),
  });

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EditProjectLibraryFormValues>({
    resolver: zodResolver(editProjectLibraryFormSchema),
    defaultValues: {
      categoryId: library.projectCategoryId ?? LIBRARY_DEFAULT,
      version: library.version ?? "",
    },
  });

  // PATCH leva só o que mudou; versão apagada vira null (limpa), não ""
  function changesFrom(
    values: EditProjectLibraryFormValues,
  ): UpdateProjectLibraryInput {
    const changes: UpdateProjectLibraryInput = {};
    const categoryId =
      values.categoryId === LIBRARY_DEFAULT ? null : values.categoryId;
    const version = values.version.trim() || null;

    if (categoryId !== library.projectCategoryId) {
      changes.categoryId = categoryId;
    }
    if (version !== library.version) {
      changes.version = version;
    }
    return changes;
  }

  const mutation = useMutation({
    mutationFn: (changes: UpdateProjectLibraryInput) =>
      updateProjectLibrary(projectId, library.id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-libraries", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["library-projects", library.id],
      });
      queryClient.invalidateQueries({ queryKey: ["libraries-overview"] });
      queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
      onSaved();
    },
  });

  const categories = categoriesQuery.data ?? [];
  const libraryCategoryName = library.categoryId
    ? categories.find((category) => category.id === library.categoryId)?.name
    : "sem categoria";
  const hasChanges =
    Object.keys(
      changesFrom({
        categoryId: watch("categoryId"),
        version: watch("version"),
      }),
    ).length > 0;

  return (
    <form
      className="flex h-full flex-col gap-4.5"
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(changesFrom(values)))}
    >
      <SheetHeader>
        <SheetTitle>Editar no projeto</SheetTitle>
        <SheetDescription>
          {library.name} em {projectName} — categoria e versão valem só para
          este projeto.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-[7px]">
        <Label
          htmlFor="edit-project-library-category"
          className="text-[12.5px] font-medium text-secondary-foreground"
        >
          Categoria neste projeto
        </Label>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={categoriesQuery.isLoading}
            >
              <SelectTrigger
                id="edit-project-library-category"
                aria-label="Categoria neste projeto"
                className="h-10 rounded-lg border-input bg-surface-input px-3 text-[13.5px] text-foreground"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LIBRARY_DEFAULT}>
                  Padrão da biblioteca ({libraryCategoryName ?? "Categoria"})
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-text-faint">
          Lista o padrão da biblioteca, as categorias globais e as deste
          projeto. Não altera a biblioteca no catálogo.
        </p>
      </div>

      <div className="flex flex-col gap-[7px]">
        <Label
          htmlFor="edit-project-library-version"
          className="text-[12.5px] font-medium text-secondary-foreground"
        >
          Versão
        </Label>
        <Input
          id="edit-project-library-version"
          type="text"
          placeholder="ex: 18.3.1"
          aria-invalid={errors.version ? true : undefined}
          className="font-mono"
          {...register("version")}
        />
        {errors.version && (
          <p className="text-xs text-destructive">{errors.version.message}</p>
        )}
      </div>

      {mutation.isError && (
        <p className="text-xs text-destructive">
          {mutation.error instanceof UpdateProjectLibraryError
            ? mutation.error.message
            : "Não foi possível salvar. Tente novamente."}
        </p>
      )}

      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </SheetClose>
        <Button type="submit" disabled={!hasChanges || mutation.isPending}>
          <Check />
          {mutation.isPending ? "salvando..." : "Salvar"}
        </Button>
      </SheetFooter>
    </form>
  );
}

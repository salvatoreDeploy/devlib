"use client";

import type { ElementType } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/tag-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateLibrary,
  UpdateLibraryError,
  type Library,
} from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";
import {
  addTagToLibrary,
  AddTagToLibraryError,
  listLibraryTags,
} from "../lib/api/tags";

// Edição da biblioteca NO CATÁLOGO (vale pra todos os projetos), aberta no
// próprio drawer "Detalhe da biblioteca" — substitui /libraries/[id]/edit.
// A categoria/versão de uma lib DENTRO de um projeto é o drawer "Editar no
// projeto", não este.

const editLibraryFormSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});

type EditLibraryFormValues = z.infer<typeof editLibraryFormSchema>;

type EditLibraryFormProps = {
  library: Library;
  onCancel: () => void;
  onSaved: (library: Library) => void;
  // dentro de um Sheet, o drawer passa o SheetTitle (o Radix exige um título)
  titleAs?: ElementType;
};

export function EditLibraryForm({
  library,
  onCancel,
  onSaved,
  titleAs: Title = "h2",
}: EditLibraryFormProps) {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const tagsQuery = useQuery({
    queryKey: ["library-tags", library.id],
    queryFn: () => listLibraryTags(library.id),
  });

  // tag grava na hora (POST /libraries/:id/tags), independente do Salvar
  const addTagMutation = useMutation({
    mutationFn: (name: string) => addTagToLibrary(library.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-tags", library.id] });
      // facetas de tag da Home
      queryClient.invalidateQueries({ queryKey: ["libraries-catalog"] });
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditLibraryFormValues>({
    resolver: zodResolver(editLibraryFormSchema),
    defaultValues: {
      name: library.name,
      categoryId: library.categoryId ?? "",
      notes: library.notes ?? "",
    },
  });

  const mutation = useMutation({
    // a API ainda não aceita null: categoria/notas vazias não são enviadas
    // (o valor antigo fica) — ver aviso no formulário
    mutationFn: (data: EditLibraryFormValues) =>
      updateLibrary(library.id, {
        name: data.name,
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.notes?.trim() ? { notes: data.notes } : {}),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["library", library.id], updated);
      queryClient.invalidateQueries({ queryKey: ["library", library.id] });
      queryClient.invalidateQueries({ queryKey: ["libraries-catalog"] });
      // o nome aparece nas tabelas de bibliotecas dos projetos
      queryClient.invalidateQueries({ queryKey: ["project-libraries"] });
      queryClient.invalidateQueries({
        queryKey: ["library-projects", library.id],
      });
      onSaved(updated);
    },
  });

  return (
    <form
      className="flex h-full flex-col gap-4.5 overflow-y-auto"
      noValidate
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
    >
      <div className="flex flex-col gap-1.5">
        <Title className="text-[19px] font-bold tracking-[-0.015em] text-foreground">
          Editar biblioteca
        </Title>
        <p className="text-[13px] leading-[1.6] text-muted-foreground">
          Edita {library.name} no catálogo: vale pra todos os projetos que usam
          a biblioteca.
        </p>
      </div>

      <div className="flex flex-col gap-[7px]">
        <Label
          htmlFor="edit-library-name"
          className="text-[12.5px] font-medium text-secondary-foreground"
        >
          Nome da biblioteca
        </Label>
        <Input
          id="edit-library-name"
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
          htmlFor="edit-library-category"
          className="text-[12.5px] font-medium text-secondary-foreground"
        >
          Categoria no catálogo
        </Label>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={categoriesQuery.isLoading}
            >
              <SelectTrigger
                id="edit-library-category"
                aria-label="Categoria no catálogo"
                className="h-10 rounded-lg border-input bg-surface-input px-3 text-[13.5px] text-foreground"
              >
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                {/* só globais: biblioteca é catálogo compartilhado */}
                {categoriesQuery.data?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-[7px]">
        <Label
          htmlFor="edit-library-notes"
          className="text-[12.5px] font-medium text-secondary-foreground"
        >
          Notas
        </Label>
        <Textarea
          id="edit-library-notes"
          placeholder="pra que serve, quando usar"
          className="h-[76px] resize-none rounded-lg border-input bg-surface-input px-3 py-2 text-[13.5px] text-foreground"
          {...register("notes")}
        />
        <p className="text-xs text-text-faint">
          Ainda não dá pra remover a categoria nem apagar as notas — só trocar.
        </p>
      </div>

      <div className="flex flex-col gap-[7px]">
        <Label className="text-[12.5px] font-medium text-secondary-foreground">
          Tags
        </Label>
        <TagInput
          tags={tagsQuery.data ?? []}
          onAddTag={(name) => addTagMutation.mutate(name)}
          isAdding={addTagMutation.isPending}
          error={
            addTagMutation.isError
              ? addTagMutation.error instanceof AddTagToLibraryError
                ? addTagMutation.error.message
                : "Não foi possível adicionar a tag."
              : null
          }
        />
      </div>

      {mutation.isError && (
        <p role="alert" className="text-xs text-destructive">
          {mutation.error instanceof UpdateLibraryError
            ? mutation.error.message
            : "Não foi possível atualizar a biblioteca. Tente novamente."}
        </p>
      )}

      <div className="mt-auto flex items-center justify-end gap-2.25 pt-0.5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          <Check />
          {mutation.isPending ? "salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

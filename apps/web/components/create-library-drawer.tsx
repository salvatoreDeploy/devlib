"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  createLibrary,
  CreateLibraryError,
  Library,
} from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";

const createLibraryFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});

type CreateLibraryFormValues = z.infer<typeof createLibraryFormSchema>;

type CreateLibraryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (library: Library) => void;
};

export function CreateLibraryDrawer({
  open,
  onOpenChange,
  onCreated,
}: CreateLibraryDrawerProps) {
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    enabled: open,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLibraryFormValues>({
    resolver: zodResolver(createLibraryFormSchema),
    defaultValues: { name: "", categoryId: "", notes: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateLibraryFormValues) =>
      createLibrary({
        name: data.name,
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      }),
    onSuccess: (library) => {
      reset();
      onCreated(library);
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
            <SheetTitle>Criar biblioteca</SheetTitle>
            <SheetDescription>
              Adicione uma biblioteca ao catálogo compartilhado.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-[7px]">
            <Label
              htmlFor="create-library-name"
              className="text-[12.5px] font-medium text-secondary-foreground"
            >
              Nome da biblioteca
            </Label>
            <Input
              id="create-library-name"
              type="text"
              placeholder="drizzle-orm"
              aria-invalid={errors.name ? true : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-[7px]">
            <Label
              htmlFor="create-library-categoryId"
              className="text-[12.5px] font-medium text-secondary-foreground"
            >
              Categoria
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
                    id="create-library-categoryId"
                    aria-label="Categoria"
                    className="h-10 rounded-lg border-input bg-surface-input px-3 text-[13.5px] text-foreground"
                  >
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
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

          <div className="flex flex-col gap-2">
            <Label className="text-[12.5px] font-medium text-secondary-foreground">
              Tags
            </Label>
            <button
              type="button"
              disabled
              className="inline-flex w-fit items-center rounded-full border border-dashed border-checkbox-border px-2.5 py-1 text-xs text-text-faint opacity-50"
            >
              + tag
            </button>
            <p className="text-xs text-muted-foreground">
              Disponível depois de salvar a biblioteca.
            </p>
          </div>

          <div className="flex flex-col gap-[7px]">
            <Label
              htmlFor="create-library-notes"
              className="text-[12.5px] font-medium text-secondary-foreground"
            >
              Notas
            </Label>
            <Textarea
              id="create-library-notes"
              placeholder="pra que serve, quando usar"
              className="h-[76px] resize-none rounded-lg border-input bg-surface-input px-3 py-2 text-[13.5px] text-foreground"
              {...register("notes")}
            />
          </div>

          {mutation.isError && (
            <p className="text-xs text-destructive">
              {mutation.error instanceof CreateLibraryError
                ? mutation.error.message
                : "Não foi possível criar a biblioteca. Tente novamente."}
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

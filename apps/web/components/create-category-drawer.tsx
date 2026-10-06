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
  createProjectCategory,
  CreateProjectCategoryError,
  type Category,
} from "../lib/api/categories";

const createCategoryFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

type CreateCategoryFormValues = z.infer<typeof createCategoryFormSchema>;

type CreateCategoryDrawerProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (category: Category) => void;
};

export function CreateCategoryDrawer({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: CreateCategoryDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryFormValues>({
    resolver: zodResolver(createCategoryFormSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: CreateCategoryFormValues) =>
      createProjectCategory(projectId, data),
    onSuccess: (category) => {
      reset();
      onCreated(category);
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
            <SheetTitle>Criar categoria</SheetTitle>
            <SheetDescription>
              Categorias agrupam bibliotecas com o mesmo papel no projeto.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-[7px]">
            <Label
              htmlFor="create-category-name"
              className="text-[12.5px] font-medium text-secondary-foreground"
            >
              Nome
            </Label>
            <Input
              id="create-category-name"
              type="text"
              placeholder="Infra interna"
              aria-invalid={errors.name ? true : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-xs text-destructive">
              {mutation.error instanceof CreateProjectCategoryError
                ? mutation.error.message
                : "Não foi possível criar a categoria. Tente novamente."}
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

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { createLibrary, CreateLibraryError } from "../../../lib/api/libraries";
import { getCategories } from "../../../lib/api/categories";
import { getAccessToken } from "../../../lib/auth-storage";
import { useRequireAuth } from "../../../lib/use-require-auth";

const newLibraryFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});

type NewLibraryFormValues = z.infer<typeof newLibraryFormSchema>;

export default function NewLibraryPage() {
  const isAuthenticated = useRequireAuth();
  const router = useRouter();

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(getAccessToken() ?? ""),
    enabled: isAuthenticated,
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<NewLibraryFormValues>({
    resolver: zodResolver(newLibraryFormSchema),
    defaultValues: { name: "", categoryId: "", notes: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: NewLibraryFormValues) =>
      createLibrary(
        {
          name: data.name,
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
        },
        getAccessToken() ?? "",
      ),
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
            Criar biblioteca
          </h1>
          <p className="text-[13px] leading-[1.6] text-muted-foreground">
            Adicione uma biblioteca ao catálogo compartilhado.
          </p>
        </div>

        <div className="flex flex-col gap-[7px]">
          <Label
            htmlFor="name"
            className="text-[12.5px] font-medium text-secondary-foreground"
          >
            Nome da biblioteca
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="drizzle-orm"
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
            htmlFor="categoryId"
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
                  id="categoryId"
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

        <div className="flex flex-col gap-[7px]">
          <Label
            htmlFor="notes"
            className="text-[12.5px] font-medium text-secondary-foreground"
          >
            Notas
          </Label>
          <Textarea
            id="notes"
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

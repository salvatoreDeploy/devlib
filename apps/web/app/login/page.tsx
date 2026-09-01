"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, LoginError } from "../../lib/api/auth";
import { saveTokens } from "../../lib/auth-storage";

const loginFormSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (tokens) => {
      saveTokens(tokens);
      router.push("/");
    },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        className="w-full max-w-xs rounded-lg bg-card p-6"
        noValidate
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
      >
        <h1 className="text-base font-semibold">Entrar</h1>
        <p className="mt-1 mb-5 text-xs text-muted-foreground">
          Acesse seu catálogo de bibliotecas
        </p>

        <div className="mb-3">
          <Label
            htmlFor="email"
            className="mb-1 block text-[11px] font-normal text-muted-foreground"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="nome@empresa.com"
            className="h-8 text-xs"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="mb-1">
          <Label
            htmlFor="password"
            className="mb-1 block text-[11px] font-normal text-muted-foreground"
          >
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            className="h-8 text-xs"
            aria-invalid={errors.password ? true : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="mb-4 text-right">
          <Link
            href="#"
            className="text-xs text-link underline-offset-2 hover:underline"
          >
            esqueci minha senha
          </Link>
        </div>

        {mutation.isError && (
          <p className="mb-3 text-xs text-destructive">
            {mutation.error instanceof LoginError
              ? mutation.error.message
              : "Não foi possível entrar. Tente novamente."}
          </p>
        )}

        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? (
            "Entrando..."
          ) : (
            <>
              Entrar
              <ArrowUpRight />
            </>
          )}
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          ainda não tem conta?{" "}
          <Link
            href="#"
            className="text-link underline-offset-2 hover:underline"
          >
            criar conta
          </Link>
        </p>
      </form>
    </main>
  );
}

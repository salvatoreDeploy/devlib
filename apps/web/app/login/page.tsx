"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <main className="flex min-h-screen items-center justify-center bg-background px-10">
      <form
        className="flex w-100 flex-col gap-6"
        noValidate
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-6.5 items-center justify-center rounded-[7px] border-[1.5px] border-primary text-[13px] font-bold text-primary">
            D
          </div>
          <span className="text-[15px] font-medium text-foreground">
            devlib.dev
          </span>
        </div>

        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-foreground">
          Seu catálogo de bibliotecas
        </h1>

        <p className="text-[15px] leading-[1.65] text-muted-foreground text-pretty">
          O DevLib guarda toda biblioteca que você usa — versão, categoria,
          comando de instalação e a nota do porquê você escolheu ela.{" "}
          <span className="text-foreground">Um lugar só</span>, por projeto.
        </p>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="seu e-mail"
            className="h-11 rounded-[9px] border-input bg-surface-input px-3.5 text-sm text-foreground"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}

          <label htmlFor="password" className="sr-only">
            Senha
          </label>
          <Input
            id="password"
            type="password"
            placeholder="sua senha"
            className="h-11 rounded-[9px] border-input bg-surface-input px-3.5 text-sm text-foreground"
            aria-invalid={errors.password ? true : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {mutation.isError && (
          <p className="text-xs text-destructive">
            {mutation.error instanceof LoginError
              ? mutation.error.message
              : "Não foi possível entrar. Tente novamente."}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Link href="/forgot-password" className="text-[13px] text-text-faint">
            esqueci minha senha
          </Link>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-auto rounded-[9px] px-4 py-2.5 text-sm font-semibold"
          >
            <Check />
            {mutation.isPending ? "entrando..." : "entrar"}
          </Button>
        </div>

        <div className="mt-2 h-px bg-border-faint" />

        <span className="text-[13px] text-text-faint">
          ainda não tem conta?{" "}
          <Link href="/register" className="text-primary">
            criar conta
          </Link>
        </span>
      </form>
    </main>
  );
}

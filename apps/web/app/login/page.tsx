"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
        noValidate
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
      >
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Entrar</h1>

        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          className="mt-1 mb-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          {...register("email")}
        />
        {errors.email && (
          <p className="mb-3 text-sm text-red-600">{errors.email.message}</p>
        )}

        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Senha
        </label>
        <input
          id="password"
          type="password"
          className="mt-1 mb-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          {...register("password")}
        />
        {errors.password && (
          <p className="mb-3 text-sm text-red-600">{errors.password.message}</p>
        )}

        {mutation.isError && (
          <p className="mb-3 text-sm text-red-600">
            {mutation.error instanceof LoginError
              ? mutation.error.message
              : "Não foi possível entrar. Tente novamente."}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

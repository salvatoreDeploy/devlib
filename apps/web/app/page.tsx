"use client";

import Link from "next/link";
import {
  BarChart3,
  FolderKanban,
  List,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/header";
import { useRequireAuth } from "../lib/use-require-auth";

type NavCard = {
  label: string;
  description: string;
  icon: LucideIcon;
} & ({ href: string; disabled?: false } | { href?: undefined; disabled: true });

const navCards: NavCard[] = [
  {
    label: "Projetos",
    description: "Seus projetos e o que cada um usa",
    icon: FolderKanban,
    href: "/projects",
  },
  {
    label: "Bibliotecas",
    description: "Cadastrar uma biblioteca no catálogo",
    icon: List,
    href: "/libraries/new",
  },
  {
    label: "Métricas",
    description: "Em breve",
    icon: BarChart3,
    disabled: true,
  },
  {
    label: "Configurações",
    description: "Em breve",
    icon: Settings,
    disabled: true,
  },
];

export default function Home() {
  const isAuthenticated = useRequireAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-10 py-[34px] pb-[60px]">
        <h1 className="text-[21px] font-bold tracking-[-0.015em] text-foreground">
          Seu catálogo de bibliotecas
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Escolha por onde continuar.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-5">
          {navCards.map((card) => {
            const Icon = card.icon;
            const content = (
              <>
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-[15px] font-semibold text-foreground">
                    {card.label}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </>
            );

            if (card.disabled) {
              return (
                <span
                  key={card.label}
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-start gap-3 rounded-[11px] border border-border bg-card p-[18px] opacity-50"
                >
                  {content}
                </span>
              );
            }

            return (
              <Link
                key={card.label}
                href={card.href}
                className="flex items-start gap-3 rounded-[11px] border border-border bg-card p-[18px] hover:border-checkbox-border"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

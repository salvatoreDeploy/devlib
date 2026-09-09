"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  FolderKanban,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getLibrariesOverview,
  GetLibrariesOverviewError,
} from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";
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

function projectsCountLabel(count: number): string {
  if (count === 0) {
    return "Nenhum projeto";
  }
  return count === 1 ? "1 projeto" : `${count} projetos`;
}

export default function Home() {
  const isAuthenticated = useRequireAuth();
  const router = useRouter();

  const librariesQuery = useQuery({
    queryKey: ["libraries-overview"],
    queryFn: () => getLibrariesOverview(),
    enabled: isAuthenticated,
    retry: false,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  const categoryNameById = new Map(
    (categoriesQuery.data ?? []).map((category) => [
      category.id,
      category.name,
    ]),
  );

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

        <div className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[21px] font-bold tracking-[-0.015em] text-foreground">
              Bibliotecas
            </h2>
            <Link
              href="/libraries/new"
              className="rounded-full bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-brand-hover"
            >
              + Nova biblioteca
            </Link>
          </div>

          {librariesQuery.isLoading && (
            <p className="text-[13px] text-muted-foreground">carregando...</p>
          )}

          {librariesQuery.isError && (
            <p className="text-[13px] text-destructive">
              {librariesQuery.error instanceof GetLibrariesOverviewError
                ? librariesQuery.error.message
                : "Não foi possível buscar as bibliotecas."}
            </p>
          )}

          {librariesQuery.data && librariesQuery.data.length === 0 && (
            <p className="text-[13px] text-muted-foreground">
              Nenhuma biblioteca no catálogo ainda.
            </p>
          )}

          {librariesQuery.data && librariesQuery.data.length > 0 && (
            <div className="rounded-[11px] border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Biblioteca</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {librariesQuery.data.map((library) => (
                    <TableRow
                      key={library.id}
                      onClick={() => router.push(`/libraries/${library.id}`)}
                      className="cursor-pointer hover:bg-surface-raised"
                    >
                      <TableCell className="font-medium">
                        {library.name}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-[6px] border border-input bg-secondary px-[9px] py-[3px] text-[12px] text-muted-foreground">
                          {library.categoryId
                            ? (categoryNameById.get(library.categoryId) ??
                              "Categoria")
                            : "Sem categoria"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="rounded-[6px] bg-brand-bg px-[9px] py-[3px] text-[10.5px] font-bold tracking-[0.05em] text-primary uppercase">
                          Atualizada
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {projectsCountLabel(library.projectsCount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

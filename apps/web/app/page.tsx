"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, SearchX } from "lucide-react";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateProjectDrawer } from "@/components/create-project-drawer";
import { CreateLibraryDrawer } from "@/components/create-library-drawer";
import { LibraryDetailDrawer } from "@/components/library-detail-drawer";
import { ProjectCard } from "@/components/project-card";
import { EffectiveCategoryChips } from "@/components/effective-category-chips";
import { HomeLibrariesToolbar } from "@/components/home-libraries-toolbar";
import { ListPagination } from "@/components/list-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DeleteProjectError,
  deleteProject,
  GetProjectsOverviewError,
  getProjectsOverview,
} from "../lib/api/projects";
import {
  getCatalogFacets,
  getLibrariesCatalog,
  GetLibrariesCatalogError,
} from "../lib/api/libraries";
import {
  DEFAULT_HOME_FILTERS,
  hasActiveHomeFilters,
  parseHomeFilters,
  toCatalogParams,
  toHomeSearchString,
  type HomeLibrariesFilters,
} from "../lib/home-libraries-filters";
import { getCategories } from "../lib/api/categories";
import { useRequireAuth } from "../lib/use-require-auth";

const PROJECTS_GRID_LIMIT = 4;

function projectsCountLabel(count: number): string {
  if (count === 0) {
    return "Nenhum projeto";
  }
  return count === 1 ? "1 projeto" : `${count} projetos`;
}

// useSearchParams numa página estática exige um limite de Suspense no build
// do Next 15; o fallback é o mesmo vazio de antes do login confirmar
export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const isAuthenticated = useRequireAuth();
  const queryClient = useQueryClient();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateLibraryOpen, setIsCreateLibraryOpen] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(
    null,
  );

  const projectsQuery = useQuery({
    queryKey: ["projects-overview"],
    queryFn: () => getProjectsOverview(),
    enabled: isAuthenticated,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
    },
  });

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // busca/filtros/página da seção Bibliotecas vivem na URL
  const filters = parseHomeFilters(searchParams);
  const catalogParams = toCatalogParams(filters);

  function navigate(next: HomeLibrariesFilters, mode: "push" | "replace") {
    const search = toHomeSearchString(next);
    // push só na troca de página (Voltar volta à página anterior)
    router[mode](search ? `${pathname}?${search}` : pathname, {
      scroll: false,
    });
  }

  // paginado no servidor; o prefixo ["libraries-catalog"] é o que as
  // mutações invalidam (lista + facetas)
  const librariesQuery = useQuery({
    queryKey: ["libraries-catalog", "list", catalogParams],
    queryFn: () => getLibrariesCatalog(catalogParams),
    enabled: isAuthenticated,
    retry: false,
    // mantém a página anterior na tela enquanto a próxima carrega
    placeholderData: keepPreviousData,
  });

  const facetsQuery = useQuery({
    queryKey: ["libraries-catalog", "facets"],
    queryFn: () => getCatalogFacets(),
    enabled: isAuthenticated,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  const categoryNameById = new Map([
    ...(facetsQuery.data?.categories ?? []).map(
      (category) => [category.id, category.name] as const,
    ),
    ...(categoriesQuery.data ?? []).map(
      (category) => [category.id, category.name] as const,
    ),
  ]);
  const catalog = librariesQuery.data;
  const filtering = hasActiveHomeFilters(filters);
  const showToolbar = Boolean(catalog && (catalog.total > 0 || filtering));

  const projects = projectsQuery.data?.slice(0, PROJECTS_GRID_LIMIT);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="flex flex-col gap-[22px] px-10 py-[34px] pb-[60px]">
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[21px] font-bold tracking-[-0.015em] text-foreground">
              Projetos
            </h2>
            <div className="flex items-center gap-4">
              <Button onClick={() => setIsCreateProjectOpen(true)}>
                <Plus />
                Criar projeto
              </Button>
              <Link
                href="/projects"
                className="text-[12.5px] text-primary hover:underline"
              >
                Ver todos os projetos
              </Link>
            </div>
          </div>

          {deleteMutation.isError && (
            <p className="mb-4 text-[13px] text-destructive">
              {deleteMutation.error instanceof DeleteProjectError
                ? deleteMutation.error.message
                : "Não foi possível excluir o projeto. Tente novamente."}
            </p>
          )}

          {projectsQuery.isLoading && (
            <p className="text-[13px] text-muted-foreground">carregando...</p>
          )}

          {projectsQuery.isError && (
            <p className="text-[13px] text-destructive">
              {projectsQuery.error instanceof GetProjectsOverviewError
                ? projectsQuery.error.message
                : "Não foi possível listar os projetos."}
            </p>
          )}

          {projects && projects.length === 0 && (
            <p className="text-[13px] text-muted-foreground">
              Nenhum projeto ainda. Crie o primeiro pra começar a catalogar suas
              bibliotecas.
            </p>
          )}

          {projects && projects.length > 0 && (
            <div className="grid grid-cols-2 gap-5">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isDeleting={
                    deleteMutation.isPending &&
                    deleteMutation.variables === project.id
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[21px] font-bold tracking-[-0.015em] text-foreground">
              Bibliotecas
            </h2>
            <Button onClick={() => setIsCreateLibraryOpen(true)}>
              <Plus />
              Nova biblioteca
            </Button>
          </div>

          {librariesQuery.isLoading && (
            <p className="text-[13px] text-muted-foreground">carregando...</p>
          )}

          {librariesQuery.isError && (
            <p className="text-[13px] text-destructive">
              {librariesQuery.error instanceof GetLibrariesCatalogError
                ? librariesQuery.error.message
                : "Não foi possível buscar as bibliotecas."}
            </p>
          )}

          {catalog && catalog.total === 0 && !filtering && (
            <p className="text-[13px] text-muted-foreground">
              Nenhuma biblioteca no catálogo ainda.
            </p>
          )}

          {showToolbar && (
            <div className="mb-3">
              <HomeLibrariesToolbar
                filters={filters}
                facets={facetsQuery.data}
                onChange={(changes) =>
                  navigate({ ...filters, ...changes, page: 1 }, "replace")
                }
                onClear={() => navigate(DEFAULT_HOME_FILTERS, "replace")}
              />
            </div>
          )}

          {catalog && showToolbar && (
            <div className="overflow-hidden rounded-[11px] border border-border bg-card">
              {catalog.total === 0 ? (
                <div className="flex flex-col items-center gap-3 px-[18px] py-12 text-center">
                  <SearchX
                    className="size-[22px] text-text-fainter"
                    aria-hidden="true"
                  />
                  <p className="text-[13.5px] font-medium text-secondary-foreground">
                    Nenhuma biblioteca com esses filtros.
                  </p>
                  <p className="text-[12.5px] text-text-faint">
                    Ajuste a busca ou limpe os filtros.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(DEFAULT_HOME_FILTERS, "replace")}
                  >
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <>
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
                      {catalog.items.map((library) => (
                        <TableRow
                          key={library.id}
                          onClick={() => setSelectedLibraryId(library.id)}
                          className="cursor-pointer hover:bg-surface-raised"
                        >
                          <TableCell className="font-medium">
                            {library.name}
                          </TableCell>
                          <TableCell>
                            <EffectiveCategoryChips
                              effectiveCategories={library.effectiveCategories}
                              globalCategoryName={
                                library.categoryId
                                  ? categoryNameById.get(library.categoryId)
                                  : null
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="updated">Atualizada</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {projectsCountLabel(library.projectsCount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ListPagination
                    page={catalog.page}
                    pageCount={Math.max(
                      1,
                      Math.ceil(catalog.total / catalog.pageSize),
                    )}
                    start={(catalog.page - 1) * catalog.pageSize + 1}
                    end={
                      (catalog.page - 1) * catalog.pageSize +
                      catalog.items.length
                    }
                    total={catalog.total}
                    itemLabel="bibliotecas"
                    itemLabelSingular="biblioteca"
                    onPageChange={(page) =>
                      navigate({ ...filters, page }, "push")
                    }
                  />
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <CreateProjectDrawer
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        onCreated={() => {
          setIsCreateProjectOpen(false);
          queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
        }}
      />
      <CreateLibraryDrawer
        open={isCreateLibraryOpen}
        onOpenChange={setIsCreateLibraryOpen}
        onCreated={() => {
          setIsCreateLibraryOpen(false);
          queryClient.invalidateQueries({ queryKey: ["libraries-overview"] });
          queryClient.invalidateQueries({ queryKey: ["libraries-catalog"] });
        }}
      />
      <LibraryDetailDrawer
        libraryId={selectedLibraryId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLibraryId(null);
          }
        }}
      />
    </div>
  );
}

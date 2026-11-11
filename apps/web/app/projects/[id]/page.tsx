"use client";

import { useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, SearchX, Upload } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { CreateLibraryDrawer } from "@/components/create-library-drawer";
import { ProjectTabs } from "@/components/project-tabs";
import { EditProjectLibraryDrawer } from "@/components/edit-project-library-drawer";
import { ImportPackageJsonDrawer } from "@/components/import-package-json-drawer";
import { ListPagination } from "@/components/list-pagination";
import { ProjectLibrariesToolbar } from "@/components/project-libraries-toolbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getProject,
  GetProjectError,
  getProjectLibraries,
  GetProjectLibrariesError,
  removeLibraryFromProject,
  RemoveLibraryFromProjectError,
  type ProjectLibrary,
} from "../../../lib/api/projects";
import { getProjectCategories } from "../../../lib/api/categories";
import { useRequireAuth } from "../../../lib/use-require-auth";
import {
  applyFilters,
  categoryOptions,
  DEFAULT_FILTERS,
  parseFilters,
  toSearchString,
  type ProjectLibrariesFilters,
} from "../../../lib/project-libraries-filters";

export default function ProjectDetailPage() {
  const isAuthenticated = useRequireAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [libraryToEdit, setLibraryToEdit] = useState<ProjectLibrary | null>(
    null,
  );
  const [isAddLibraryOpen, setIsAddLibraryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [libraryToRemove, setLibraryToRemove] = useState<ProjectLibrary | null>(
    null,
  );
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // busca/filtros/página vivem na URL — recarregar ou compartilhar mantém
  const filters = parseFilters(searchParams);

  function navigate(next: ProjectLibrariesFilters, mode: "push" | "replace") {
    const search = toSearchString(next);
    const url = search ? `${pathname}?${search}` : pathname;
    // push só na troca de página (Voltar volta à página anterior); digitar e
    // filtrar usa replace pra não criar uma entrada de histórico por tecla
    router[mode](url, { scroll: false });
  }

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
    enabled: isAuthenticated,
    retry: false,
  });

  const librariesQuery = useQuery({
    queryKey: ["project-libraries", id],
    queryFn: () => getProjectLibraries(id),
    enabled: isAuthenticated,
    retry: false,
  });

  // globais + do projeto — a categoria efetiva de uma lib pode ser do projeto
  const categoriesQuery = useQuery({
    queryKey: ["project-categories", id],
    queryFn: () => getProjectCategories(id),
    enabled: isAuthenticated,
  });

  // só fecha no sucesso — na falha a confirmação fica aberta com o erro
  const removeMutation = useMutation({
    mutationFn: (libraryId: string) => removeLibraryFromProject(id, libraryId),
    onSuccess: (_, libraryId) => {
      queryClient.invalidateQueries({ queryKey: ["project-libraries", id] });
      queryClient.invalidateQueries({
        queryKey: ["library-projects", libraryId],
      });
      queryClient.invalidateQueries({ queryKey: ["libraries-overview"] });
      queryClient.invalidateQueries({ queryKey: ["libraries-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
      // a contagem da aba Categorias usa a categoria efetiva da associação
      queryClient.invalidateQueries({ queryKey: ["project-categories", id] });
      setLibraryToRemove(null);
    },
  });

  if (!isAuthenticated) {
    return null;
  }

  if (projectQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="px-10 py-[34px]">
          <p className="text-[13px] text-muted-foreground">carregando...</p>
        </main>
      </div>
    );
  }

  if (projectQuery.isError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="px-10 py-[34px]">
          <p className="text-[13px] text-destructive">
            {projectQuery.error instanceof GetProjectError
              ? projectQuery.error.message
              : "Não foi possível carregar o projeto."}
          </p>
        </main>
      </div>
    );
  }

  const project = projectQuery.data;

  if (!project) {
    return null;
  }

  const categoryNameById = new Map(
    (categoriesQuery.data ?? []).map((category) => [
      category.id,
      category.name,
    ]),
  );

  const result = librariesQuery.data
    ? applyFilters(librariesQuery.data, filters)
    : null;

  function effectiveCategoryName(library: ProjectLibrary) {
    const categoryId = library.projectCategoryId ?? library.categoryId;
    if (!categoryId) {
      return "Sem categoria";
    }
    return categoryNameById.get(categoryId) ?? "Categoria";
  }

  return (
    <div className="min-h-screen bg-background">
      <Header breadcrumbLabel={project.name} />
      <ProjectTabs projectId={id} />

      <main className="px-10 py-[34px] pb-[60px]">
        <h2 className="text-[21px] font-bold tracking-[-0.015em] text-foreground">
          {project.name}
        </h2>
        {project.description && (
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {project.description}
          </p>
        )}

        <div className="mt-8 mb-3 flex items-center gap-3.5">
          <h3 className="text-[15px] font-semibold text-foreground">
            Bibliotecas
          </h3>
          <Button onClick={() => setIsAddLibraryOpen(true)}>
            <Plus aria-hidden="true" />
            Adicionar biblioteca
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload aria-hidden="true" />
            Importar package.json
          </Button>
        </div>

        {librariesQuery.isLoading && (
          <p className="text-[13px] text-muted-foreground">carregando...</p>
        )}

        {librariesQuery.isError && (
          <p className="text-[13px] text-destructive">
            {librariesQuery.error instanceof GetProjectLibrariesError
              ? librariesQuery.error.message
              : "Não foi possível carregar as bibliotecas do projeto."}
          </p>
        )}

        {librariesQuery.data && librariesQuery.data.length === 0 && (
          <p className="text-[13px] text-muted-foreground">
            Nenhuma biblioteca associada a este projeto ainda.
          </p>
        )}

        {librariesQuery.data && librariesQuery.data.length > 0 && result && (
          <div className="mb-3">
            <ProjectLibrariesToolbar
              filters={filters}
              categoryOptions={categoryOptions(
                librariesQuery.data,
                categoryNameById,
              )}
              onChange={(changes) =>
                navigate({ ...filters, ...changes, page: 1 }, "replace")
              }
              onClear={() => navigate(DEFAULT_FILTERS, "replace")}
            />
          </div>
        )}

        {librariesQuery.data && librariesQuery.data.length > 0 && result && (
          <div className="overflow-hidden rounded-[11px] border border-border bg-card">
            {result.total === 0 ? (
              <div className="flex flex-col items-center gap-3 px-[18px] py-12 text-center">
                <SearchX
                  className="size-[22px] text-text-fainter"
                  aria-hidden="true"
                />
                <p className="text-[13.5px] font-medium text-secondary-foreground">
                  Nenhuma biblioteca com esses filtros.
                </p>
                <p className="text-[12.5px] text-text-faint">
                  {librariesQuery.data.length === 1
                    ? "1 biblioteca no projeto"
                    : `${librariesQuery.data.length} bibliotecas no projeto`}{" "}
                  — ajuste a busca ou limpe os filtros.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate(DEFAULT_FILTERS, "replace")}
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Versão</TableHead>
                      <TableHead className="w-[52px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.items.map((library) => (
                      <TableRow key={library.id}>
                        <TableCell className="font-medium">
                          {library.name}
                        </TableCell>
                        <TableCell>
                          <span className="rounded-[6px] border border-input bg-secondary px-[9px] py-[3px] text-[12px] text-muted-foreground">
                            {effectiveCategoryName(library)}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {library.version ?? "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label={`Ações de ${library.name}`}
                              className="flex size-[28px] items-center justify-center rounded-[7px] border border-input text-text-fainter"
                            >
                              ···
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onSelect={() => setLibraryToEdit(library)}
                              >
                                Editar no projeto
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => {
                                  removeMutation.reset();
                                  setLibraryToRemove(library);
                                }}
                              >
                                Remover do projeto
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ListPagination
                  page={result.page}
                  pageCount={result.pageCount}
                  start={result.start}
                  end={result.end}
                  total={result.total}
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
      </main>

      <CreateLibraryDrawer
        open={isAddLibraryOpen}
        onOpenChange={setIsAddLibraryOpen}
        onCreated={() => setIsAddLibraryOpen(false)}
        project={{ id, name: project.name }}
      />

      <ImportPackageJsonDrawer
        projectId={id}
        projectName={project.name}
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />

      <AlertDialog
        open={libraryToRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLibraryToRemove(null);
            removeMutation.reset();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Remover do projeto</AlertDialogTitle>
          <AlertDialogDescription>
            Remover &quot;{libraryToRemove?.name}&quot; de &quot;
            {project.name}&quot;? A versão e a categoria registradas neste
            projeto serão perdidas — a biblioteca continua no catálogo.
          </AlertDialogDescription>
          {removeMutation.isError && (
            <p role="alert" className="text-xs text-destructive">
              {removeMutation.error instanceof RemoveLibraryFromProjectError
                ? removeMutation.error.message
                : "Não foi possível remover a biblioteca do projeto. Tente novamente."}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (libraryToRemove) {
                  removeMutation.mutate(libraryToRemove.id);
                }
              }}
            >
              {removeMutation.isPending ? "removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditProjectLibraryDrawer
        projectId={id}
        projectName={project.name}
        library={libraryToEdit}
        onOpenChange={(open) => {
          if (!open) {
            setLibraryToEdit(null);
          }
        }}
      />
    </div>
  );
}

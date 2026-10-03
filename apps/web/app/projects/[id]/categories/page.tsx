"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Header } from "@/components/header";
import { ProjectTabs } from "@/components/project-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  getProject,
  GetProjectError,
  getProjectLibraries,
} from "../../../../lib/api/projects";
import {
  deleteProjectCategory,
  getProjectCategories,
  GetProjectCategoriesError,
  type Category,
} from "../../../../lib/api/categories";
import { useRequireAuth } from "../../../../lib/use-require-auth";

function librariesCountLabel(count: number): string {
  return count === 1 ? "1 biblioteca" : `${count} bibliotecas`;
}

export default function ProjectCategoriesPage() {
  const isAuthenticated = useRequireAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
    enabled: isAuthenticated,
    retry: false,
  });

  const categoriesQuery = useQuery({
    queryKey: ["project-categories", id],
    queryFn: () => getProjectCategories(id),
    enabled: isAuthenticated,
    retry: false,
  });

  const librariesQuery = useQuery({
    queryKey: ["project-libraries", id],
    queryFn: () => getProjectLibraries(id),
    enabled: isAuthenticated,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => deleteProjectCategory(id, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-categories", id] });
      setCategoryToDelete(null);
    },
  });

  const librariesCountByCategoryId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const library of librariesQuery.data ?? []) {
      if (!library.categoryId) {
        continue;
      }
      counts.set(library.categoryId, (counts.get(library.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [librariesQuery.data]);

  const categories = categoriesQuery.data ?? [];
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

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

  return (
    <div className="min-h-screen bg-background">
      <Header breadcrumbLabel={project.name} />
      <ProjectTabs projectId={id} />

      <main className="flex flex-col gap-[18px] px-10 py-[32px] pb-[60px]">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3.5">
            <h2 className="text-[21px] font-bold tracking-[-0.015em] text-foreground">
              Categorias
            </h2>
            <Button>
              <Plus />
              Criar categoria
            </Button>
          </div>

          <div className="relative h-[34px] w-[220px]">
            <Search className="absolute top-1/2 left-3.5 size-[14px] -translate-y-1/2 text-text-fainter" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="buscar categorias"
              className="h-[34px] rounded-full border-border-strong bg-surface pl-9 text-[13px] placeholder:text-text-fainter"
            />
          </div>
        </div>

        {categoriesQuery.isLoading && (
          <p className="text-[13px] text-muted-foreground">carregando...</p>
        )}

        {categoriesQuery.isError && (
          <p className="text-[13px] text-destructive">
            {categoriesQuery.error instanceof GetProjectCategoriesError
              ? categoriesQuery.error.message
              : "Não foi possível carregar as categorias do projeto."}
          </p>
        )}

        {categories.length === 0 && categoriesQuery.data && (
          <p className="text-[13px] text-muted-foreground">
            Nenhuma categoria ainda.
          </p>
        )}

        {categories.length > 0 && (
          <div className="overflow-hidden rounded-[11px] border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[26px]">
                    <Checkbox aria-label="Selecionar todas" />
                  </TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="w-[200px]">Bibliotecas</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => {
                  const isOwnedByProject = category.projectId === id;
                  return (
                    <TableRow key={category.id}>
                      <TableCell>
                        <Checkbox aria-label={`Selecionar ${category.name}`} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {librariesCountLabel(
                          librariesCountByCategoryId.get(category.id) ?? 0,
                        )}
                      </TableCell>
                      <TableCell>
                        {isOwnedByProject && (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex size-[28px] items-center justify-center rounded-[7px] border border-input text-text-fainter">
                              ···
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={(event) => {
                                  event.preventDefault();
                                  setCategoryToDelete(category);
                                }}
                              >
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between px-[18px] py-3.5">
              <p className="text-[12.5px] text-text-faint">
                Mostrando {filteredCategories.length} de {categories.length}{" "}
                categorias
              </p>
            </div>
          </div>
        )}
      </main>

      <AlertDialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &quot;{categoryToDelete?.name}
            &quot;? Essa ação não pode ser desfeita.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (categoryToDelete) {
                  deleteMutation.mutate(categoryToDelete.id);
                }
              }}
            >
              {deleteMutation.isPending ? "excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

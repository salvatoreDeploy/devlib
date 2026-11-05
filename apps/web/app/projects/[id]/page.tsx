"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { CreateLibraryDrawer } from "@/components/create-library-drawer";
import { ProjectTabs } from "@/components/project-tabs";
import { EditProjectLibraryDrawer } from "@/components/edit-project-library-drawer";
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
  type ProjectLibrary,
} from "../../../lib/api/projects";
import { getProjectCategories } from "../../../lib/api/categories";
import { useRequireAuth } from "../../../lib/use-require-auth";

export default function ProjectDetailPage() {
  const isAuthenticated = useRequireAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [libraryToEdit, setLibraryToEdit] = useState<ProjectLibrary | null>(
    null,
  );
  const [isAddLibraryOpen, setIsAddLibraryOpen] = useState(false);

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

        {librariesQuery.data && librariesQuery.data.length > 0 && (
          <div className="rounded-[11px] border border-border bg-card">
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
                {librariesQuery.data.map((library) => (
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <CreateLibraryDrawer
        open={isAddLibraryOpen}
        onOpenChange={setIsAddLibraryOpen}
        onCreated={() => setIsAddLibraryOpen(false)}
        project={{ id, name: project.name }}
      />

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

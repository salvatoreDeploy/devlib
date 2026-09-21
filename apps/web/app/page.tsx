"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateProjectDrawer } from "@/components/create-project-drawer";
import { CreateLibraryDrawer } from "@/components/create-library-drawer";
import { ProjectCard } from "@/components/project-card";
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
  getLibrariesOverview,
  GetLibrariesOverviewError,
} from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";
import { useRequireAuth } from "../lib/use-require-auth";

const PROJECTS_GRID_LIMIT = 4;

function projectsCountLabel(count: number): string {
  if (count === 0) {
    return "Nenhum projeto";
  }
  return count === 1 ? "1 projeto" : `${count} projetos`;
}

export default function Home() {
  const isAuthenticated = useRequireAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateLibraryOpen, setIsCreateLibraryOpen] = useState(false);

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
                        <Badge variant="updated">Atualizada</Badge>
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
        }}
      />
    </div>
  );
}

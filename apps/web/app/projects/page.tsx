"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { ProjectCard } from "@/components/project-card";
import {
  DeleteProjectError,
  deleteProject,
  ListProjectsError,
  listProjects,
} from "../../lib/api/projects";
import { useRequireAuth } from "../../lib/use-require-auth";

export default function ProjectsPage() {
  const isAuthenticated = useRequireAuth();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(),
    enabled: isAuthenticated,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-10 py-[34px] pb-[60px]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[21px] font-bold tracking-[-0.015em] text-foreground">
            Projetos
          </h2>
          <Link
            href="/projects/new"
            className="rounded-full bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-brand-hover"
          >
            + Criar projeto
          </Link>
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
            {projectsQuery.error instanceof ListProjectsError
              ? projectsQuery.error.message
              : "Não foi possível listar os projetos."}
          </p>
        )}

        {projectsQuery.data && projectsQuery.data.length === 0 && (
          <p className="text-[13px] text-muted-foreground">
            Nenhum projeto ainda. Crie o primeiro pra começar a catalogar suas
            bibliotecas.
          </p>
        )}

        {projectsQuery.data && projectsQuery.data.length > 0 && (
          <div className="grid grid-cols-2 gap-5">
            {projectsQuery.data.map((project) => (
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
      </main>
    </div>
  );
}

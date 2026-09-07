"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
  getLibrary,
  GetLibraryError,
  getLibraryProjects,
  GetLibraryProjectsError,
} from "../../../lib/api/libraries";
import { getCategories } from "../../../lib/api/categories";
import { listLibraryTags } from "../../../lib/api/tags";
import { useRequireAuth } from "../../../lib/use-require-auth";

export default function LibraryDetailPage() {
  const isAuthenticated = useRequireAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const libraryQuery = useQuery({
    queryKey: ["library", id],
    queryFn: () => getLibrary(id),
    enabled: isAuthenticated,
    retry: false,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    enabled: isAuthenticated,
  });

  const tagsQuery = useQuery({
    queryKey: ["library-tags", id],
    queryFn: () => listLibraryTags(id),
    enabled: isAuthenticated,
  });

  const projectsQuery = useQuery({
    queryKey: ["library-projects", id],
    queryFn: () => getLibraryProjects(id),
    enabled: isAuthenticated,
    retry: false,
  });

  if (!isAuthenticated) {
    return null;
  }

  if (libraryQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="px-10 py-[34px]">
          <p className="text-[13px] text-muted-foreground">carregando...</p>
        </main>
      </div>
    );
  }

  if (libraryQuery.isError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="px-10 py-[34px]">
          <p className="text-[13px] text-destructive">
            {libraryQuery.error instanceof GetLibraryError
              ? libraryQuery.error.message
              : "Não foi possível carregar a biblioteca."}
          </p>
        </main>
      </div>
    );
  }

  const library = libraryQuery.data;

  if (!library) {
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
      <Header breadcrumbLabel={library.name} />

      <main className="px-10 py-[34px] pb-[60px]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[21px] font-bold tracking-[-0.015em] text-foreground">
            {library.name}
          </h2>
          <span className="rounded-[6px] border border-input bg-secondary px-[9px] py-[3px] text-[12px] text-muted-foreground">
            {library.categoryId
              ? (categoryNameById.get(library.categoryId) ?? "Categoria")
              : "Sem categoria"}
          </span>
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {library.notes ?? "Sem notas."}
        </p>

        <h3 className="mt-8 mb-3 text-[15px] font-semibold text-foreground">
          Tags
        </h3>

        {tagsQuery.isLoading && (
          <p className="text-[13px] text-muted-foreground">carregando...</p>
        )}

        {tagsQuery.data && tagsQuery.data.length === 0 && (
          <p className="text-[13px] text-muted-foreground">
            Nenhuma tag associada a esta biblioteca ainda.
          </p>
        )}

        {tagsQuery.data && tagsQuery.data.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {tagsQuery.data.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full border border-input bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <h3 className="mt-8 mb-3 text-[15px] font-semibold text-foreground">
          Projetos onde é usada
        </h3>

        {projectsQuery.isLoading && (
          <p className="text-[13px] text-muted-foreground">carregando...</p>
        )}

        {projectsQuery.isError && (
          <p className="text-[13px] text-destructive">
            {projectsQuery.error instanceof GetLibraryProjectsError
              ? projectsQuery.error.message
              : "Não foi possível carregar os projetos da biblioteca."}
          </p>
        )}

        {projectsQuery.data && projectsQuery.data.length === 0 && (
          <p className="text-[13px] text-muted-foreground">
            Esta biblioteca ainda não está associada a nenhum projeto.
          </p>
        )}

        {projectsQuery.data && projectsQuery.data.length > 0 && (
          <div className="rounded-[11px] border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Versão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectsQuery.data.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {project.version ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}

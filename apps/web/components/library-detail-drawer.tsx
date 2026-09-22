"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getLibrary,
  GetLibraryError,
  getLibraryProjects,
  GetLibraryProjectsError,
} from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";
import { listLibraryTags } from "../lib/api/tags";

type LibraryDetailDrawerProps = {
  libraryId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function LibraryDetailDrawer({
  libraryId,
  onOpenChange,
}: LibraryDetailDrawerProps) {
  const open = libraryId !== null;

  const libraryQuery = useQuery({
    queryKey: ["library", libraryId],
    queryFn: () => getLibrary(libraryId as string),
    enabled: open,
    retry: false,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    enabled: open,
  });

  const tagsQuery = useQuery({
    queryKey: ["library-tags", libraryId],
    queryFn: () => listLibraryTags(libraryId as string),
    enabled: open,
  });

  const projectsQuery = useQuery({
    queryKey: ["library-projects", libraryId],
    queryFn: () => getLibraryProjects(libraryId as string),
    enabled: open,
    retry: false,
  });

  const categoryNameById = new Map(
    (categoriesQuery.data ?? []).map((category) => [
      category.id,
      category.name,
    ]),
  );

  const library = libraryQuery.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {libraryQuery.isLoading && (
          <p className="text-[13px] text-muted-foreground">carregando...</p>
        )}

        {libraryQuery.isError && (
          <p className="text-[13px] text-destructive">
            {libraryQuery.error instanceof GetLibraryError
              ? libraryQuery.error.message
              : "Não foi possível carregar a biblioteca."}
          </p>
        )}

        {library && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2.5">
                <SheetTitle>{library.name}</SheetTitle>
                <span className="rounded-[6px] border border-input bg-secondary px-[9px] py-[3px] text-[12px] text-muted-foreground">
                  {library.categoryId
                    ? (categoryNameById.get(library.categoryId) ?? "Categoria")
                    : "Sem categoria"}
                </span>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-2">
              <h3 className="text-[12.5px] font-medium text-secondary-foreground">
                Notas
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {library.notes ?? "Sem notas."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[12.5px] font-medium text-secondary-foreground">
                Tags
              </h3>

              {tagsQuery.isLoading && (
                <p className="text-[13px] text-muted-foreground">
                  carregando...
                </p>
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
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[12.5px] font-medium text-secondary-foreground">
                Usada em
              </h3>

              {projectsQuery.isLoading && (
                <p className="text-[13px] text-muted-foreground">
                  carregando...
                </p>
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
                <div className="rounded-[8px] border border-border">
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
            </div>

            <div className="mt-auto flex justify-end gap-2.25 pt-0.5">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Fechar
                </Button>
              </SheetClose>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

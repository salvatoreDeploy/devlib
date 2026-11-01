"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type LibraryProject,
} from "../lib/api/libraries";
import {
  associateLibraryToProject,
  AssociateLibraryToProjectError,
  listProjects,
  ListProjectsError,
} from "../lib/api/projects";
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

            {projectsQuery.data && (
              <AssociateProjectSection
                key={library.id}
                libraryId={library.id}
                usedIn={projectsQuery.data}
              />
            )}

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

const associateProjectFormSchema = z.object({
  projectId: z.string().min(1, "Selecione um projeto"),
  version: z
    .string()
    .trim()
    .max(100, "A versão deve ter no máximo 100 caracteres"),
});

type AssociateProjectFormValues = z.infer<typeof associateProjectFormSchema>;

type AssociateProjectSectionProps = {
  libraryId: string;
  usedIn: LibraryProject[];
};

function AssociateProjectSection({
  libraryId,
  usedIn,
}: AssociateProjectSectionProps) {
  const queryClient = useQueryClient();

  const userProjectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(),
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AssociateProjectFormValues>({
    resolver: zodResolver(associateProjectFormSchema),
    defaultValues: { projectId: "", version: "" },
  });

  const mutation = useMutation({
    // a API rejeita version "" — campo vazio vira ausência da chave
    mutationFn: ({ projectId, version }: AssociateProjectFormValues) =>
      associateLibraryToProject(projectId, {
        libraryId,
        ...(version ? { version } : {}),
      }),
    onSuccess: (association) => {
      reset();
      queryClient.invalidateQueries({
        queryKey: ["library-projects", libraryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project-libraries", association.projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["libraries-overview"] });
      queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
    },
  });

  // projetos que já usam a biblioteca saem do select — associar de novo só
  // daria 409
  const usedInIds = new Set(usedIn.map((project) => project.id));
  const availableProjects = (userProjectsQuery.data ?? []).filter(
    (project) => !usedInIds.has(project.id),
  );

  return (
    <div className="flex flex-col gap-[7px]">
      <h3 className="text-[12.5px] font-medium text-secondary-foreground">
        Associar a um projeto
      </h3>

      {userProjectsQuery.isLoading && (
        <p className="text-[13px] text-muted-foreground">carregando...</p>
      )}

      {userProjectsQuery.isError && (
        <p className="text-[13px] text-destructive">
          {userProjectsQuery.error instanceof ListProjectsError
            ? userProjectsQuery.error.message
            : "Não foi possível carregar seus projetos."}
        </p>
      )}

      {userProjectsQuery.data && userProjectsQuery.data.length === 0 && (
        <p className="text-[13px] text-muted-foreground">
          Você ainda não tem projetos.
        </p>
      )}

      {userProjectsQuery.data &&
        userProjectsQuery.data.length > 0 &&
        availableProjects.length === 0 && (
          <p className="text-[13px] text-muted-foreground">
            Já associada a todos os seus projetos.
          </p>
        )}

      {availableProjects.length > 0 && (
        <form
          className="flex flex-col gap-2"
          noValidate
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
        >
          <div className="flex gap-2">
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    aria-label="Projeto"
                    className="h-10 flex-1 rounded-lg border-input bg-surface-input px-2.5 text-[13.5px] text-foreground"
                  >
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input
              type="text"
              aria-label="Versão"
              placeholder="versão (opcional)"
              aria-invalid={errors.version ? true : undefined}
              className="w-[132px]"
              {...register("version")}
            />
          </div>

          {errors.version && (
            <p className="text-xs text-destructive">{errors.version.message}</p>
          )}

          {mutation.isError && (
            <p className="text-xs text-destructive">
              {mutation.error instanceof AssociateLibraryToProjectError
                ? mutation.error.message
                : "Não foi possível associar a biblioteca. Tente novamente."}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!watch("projectId") || mutation.isPending}
            >
              {mutation.isPending ? "associando..." : "Associar"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

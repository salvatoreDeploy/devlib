"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Check, Link2, Search } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createLibrary,
  CreateLibraryError,
  getLibrariesOverview,
  Library,
} from "../lib/api/libraries";
import {
  LIBRARY_DEFAULT,
  ProjectCategorySelect,
  toAssociationCategoryId,
} from "@/components/project-category-select";
import { getCategories, getProjectCategories } from "../lib/api/categories";
import {
  associateLibraryToProject,
  AssociateLibraryToProjectError,
  getProjectLibraries,
} from "../lib/api/projects";

const createLibraryFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
  version: z.string().optional(),
  // categoria da associação — só usada quando o drawer é aberto num projeto
  projectCategoryId: z.string(),
});

type CreateLibraryFormValues = z.infer<typeof createLibraryFormSchema>;

const MAX_SEARCH_RESULTS = 8;

// a biblioteca foi criada no catálogo (global), só a associação falhou — não
// há rollback, ela continua válida e aparece na busca pra tentar de novo
class LibraryCreatedButNotAssociatedError extends Error {}

type CreateLibraryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (library: Library) => void;
  // aberto de dentro de um projeto: busca no catálogo + associa ao salvar
  project?: { id: string; name: string };
};

export function CreateLibraryDrawer({
  open,
  onOpenChange,
  onCreated,
  project,
}: CreateLibraryDrawerProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [associateVersion, setAssociateVersion] = useState("");
  const [associateCategoryId, setAssociateCategoryId] =
    useState(LIBRARY_DEFAULT);
  const searchIds = {
    listbox: useId(),
    hint: useId(),
    version: useId(),
    category: useId(),
  };

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    enabled: open,
  });

  const catalogQuery = useQuery({
    queryKey: ["libraries-overview"],
    queryFn: () => getLibrariesOverview(),
    enabled: open && project !== undefined,
  });

  // globais + do projeto — a categoria da associação pode ser do projeto
  const projectCategoriesQuery = useQuery({
    queryKey: ["project-categories", project?.id],
    queryFn: () => getProjectCategories(project!.id),
    enabled: open && project !== undefined,
  });

  const projectLibrariesQuery = useQuery({
    queryKey: ["project-libraries", project?.id],
    queryFn: () => getProjectLibraries(project!.id),
    enabled: open && project !== undefined,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateLibraryFormValues>({
    resolver: zodResolver(createLibraryFormSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      notes: "",
      version: "",
      projectCategoryId: LIBRARY_DEFAULT,
    },
  });

  function invalidateAfterAssociation(projectId: string, libraryId: string) {
    queryClient.invalidateQueries({
      queryKey: ["project-libraries", projectId],
    });
    queryClient.invalidateQueries({ queryKey: ["libraries-overview"] });
    queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
    queryClient.invalidateQueries({
      queryKey: ["library-projects", libraryId],
    });
    // a contagem da aba Categorias usa a categoria efetiva da associação
    queryClient.invalidateQueries({
      queryKey: ["project-categories", projectId],
    });
  }

  function resetSearch() {
    setSearch("");
    setSelectedLibrary(null);
    setAssociateVersion("");
    setAssociateCategoryId(LIBRARY_DEFAULT);
  }

  function selectLibrary(library: Library) {
    if (selectedLibrary?.id !== library.id) {
      setAssociateCategoryId(LIBRARY_DEFAULT);
    }
    setSelectedLibrary(library);
  }

  const mutation = useMutation({
    mutationFn: async (data: CreateLibraryFormValues) => {
      const library = await createLibrary({
        name: data.name,
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      });
      if (!project) {
        return library;
      }
      const version = data.version?.trim();
      const categoryId = toAssociationCategoryId(data.projectCategoryId);
      try {
        await associateLibraryToProject(project.id, {
          libraryId: library.id,
          ...(version ? { version } : {}),
          ...(categoryId ? { categoryId } : {}),
        });
      } catch {
        throw new LibraryCreatedButNotAssociatedError();
      }
      return library;
    },
    onSuccess: (library) => {
      if (project) {
        invalidateAfterAssociation(project.id, library.id);
        resetSearch();
      }
      reset();
      onCreated(library);
    },
    onError: (error) => {
      if (error instanceof LibraryCreatedButNotAssociatedError) {
        queryClient.invalidateQueries({ queryKey: ["libraries-overview"] });
      }
    },
  });

  const associateMutation = useMutation({
    mutationFn: ({
      library,
      version,
      categoryId,
    }: {
      library: Library;
      version: string;
      categoryId: string | null;
    }) =>
      associateLibraryToProject(project!.id, {
        libraryId: library.id,
        ...(version ? { version } : {}),
        ...(categoryId ? { categoryId } : {}),
      }),
    onSuccess: (_association, { library }) => {
      invalidateAfterAssociation(project!.id, library.id);
      resetSearch();
      reset();
      onCreated(library);
    },
  });

  const categoryNameById = new Map(
    (categoriesQuery.data ?? []).map((category) => [
      category.id,
      category.name,
    ]),
  );
  function globalCategoryName(categoryId: string | null | undefined) {
    // null: sem categoria; undefined: nome ainda não carregado
    return categoryId ? categoryNameById.get(categoryId) : null;
  }
  const projectCategories = projectCategoriesQuery.data ?? [];
  const projectLibraryIds = new Set(
    (projectLibrariesQuery.data ?? []).map((library) => library.id),
  );
  const term = search.trim().toLowerCase();
  const searchResults = term
    ? (catalogQuery.data ?? [])
        .filter(
          (library) =>
            !projectLibraryIds.has(library.id) &&
            library.name.toLowerCase().includes(term),
        )
        .slice(0, MAX_SEARCH_RESULTS)
    : [];

  function associateSelected() {
    if (selectedLibrary && !associateMutation.isPending) {
      associateMutation.mutate({
        library: selectedLibrary,
        version: associateVersion.trim(),
        categoryId: toAssociationCategoryId(associateCategoryId),
      });
    }
  }

  // os campos da busca vivem dentro do <form> de criação — Enter neles não
  // pode submeter "Criar e associar"
  function preventFormSubmit(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  function focusSibling(event: KeyboardEvent<HTMLElement>, offset: number) {
    const options = Array.from(
      event.currentTarget
        .closest('[role="listbox"]')
        ?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
    );
    const index = options.indexOf(event.currentTarget);
    options[index + offset]?.focus();
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLLIElement>,
    library: Library,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectLibrary(library);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusSibling(event, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusSibling(event, -1);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    preventFormSubmit(event);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      document
        .getElementById(searchIds.listbox)
        ?.querySelector<HTMLElement>('[role="option"]')
        ?.focus();
    }
  }

  const createErrorMessage =
    mutation.error instanceof LibraryCreatedButNotAssociatedError
      ? "Biblioteca criada no catálogo, mas não foi possível associá-la ao projeto. Busque-a acima para tentar de novo."
      : mutation.error instanceof CreateLibraryError
        ? mutation.error.message
        : "Não foi possível criar a biblioteca. Tente novamente.";

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset();
          resetSearch();
          mutation.reset();
          associateMutation.reset();
        }
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent>
        <form
          className="flex h-full flex-col gap-4.5 overflow-y-auto"
          noValidate
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
        >
          <SheetHeader>
            <SheetTitle>
              {project ? "Adicionar biblioteca" : "Criar biblioteca"}
            </SheetTitle>
            <SheetDescription>
              {project
                ? `Busque no catálogo ou crie uma nova biblioteca para ${project.name}.`
                : "Adicione uma biblioteca ao catálogo compartilhado."}
            </SheetDescription>
          </SheetHeader>

          {project && (
            <div role="search" className="flex flex-col gap-[7px]">
              <Label
                htmlFor="create-library-search"
                className="text-[12.5px] font-medium text-secondary-foreground"
              >
                Buscar no catálogo
              </Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 size-[14px] -translate-y-1/2 text-text-faint"
                />
                <Input
                  id="create-library-search"
                  type="search"
                  autoComplete="off"
                  placeholder="nome da biblioteca"
                  className="pl-9"
                  aria-controls={
                    searchResults.length > 0 ? searchIds.listbox : undefined
                  }
                  aria-expanded={searchResults.length > 0}
                  aria-describedby={searchIds.hint}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectedLibrary(null);
                    associateMutation.reset();
                  }}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>

              {term && (
                <div className="overflow-hidden rounded-lg border border-border">
                  {searchResults.length > 0 ? (
                    <ul
                      id={searchIds.listbox}
                      role="listbox"
                      aria-label="Bibliotecas do catálogo"
                    >
                      {searchResults.map((library) => {
                        const isSelected = selectedLibrary?.id === library.id;
                        return (
                          <li
                            key={library.id}
                            role="option"
                            aria-selected={isSelected}
                            tabIndex={0}
                            onClick={() => selectLibrary(library)}
                            onKeyDown={(event) =>
                              handleOptionKeyDown(event, library)
                            }
                            className={`flex cursor-pointer items-center justify-between border-b border-border-faint px-3 py-[9px] outline-none last:border-b-0 hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:ring-1 focus-visible:ring-ring ${isSelected ? "bg-surface-raised" : ""}`}
                          >
                            <span className="flex items-center gap-2">
                              {isSelected && (
                                <Check
                                  aria-hidden="true"
                                  className="size-[13px] text-foreground"
                                />
                              )}
                              <span
                                className={`text-[13px] ${isSelected ? "font-medium text-foreground" : "text-muted-foreground"}`}
                              >
                                {library.name}
                              </span>
                            </span>
                            <span className="rounded-[6px] border border-input bg-secondary px-[9px] py-[3px] text-[12px] text-muted-foreground">
                              {library.categoryId
                                ? (categoryNameById.get(library.categoryId) ??
                                  "Categoria")
                                : "Sem categoria"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p
                      role="status"
                      className="px-3 py-[9px] text-[13px] text-muted-foreground"
                    >
                      Nenhuma biblioteca encontrada no catálogo.
                    </p>
                  )}

                  {selectedLibrary && (
                    <div className="flex flex-col gap-2 border-t border-border-faint bg-surface-raised px-3 py-2.5">
                      <div className="flex gap-2">
                        <ProjectCategorySelect
                          id={searchIds.category}
                          aria-label={`Categoria de ${selectedLibrary.name} neste projeto`}
                          value={associateCategoryId}
                          onValueChange={setAssociateCategoryId}
                          categories={projectCategories}
                          libraryCategoryName={globalCategoryName(
                            selectedLibrary.categoryId,
                          )}
                          disabled={projectCategoriesQuery.isLoading}
                          className="h-[34px] min-w-0 flex-1 text-[13px]"
                        />
                        <label htmlFor={searchIds.version} className="sr-only">
                          Versão no projeto
                        </label>
                        <Input
                          id={searchIds.version}
                          type="text"
                          autoComplete="off"
                          placeholder="versão (opcional)"
                          className="h-[34px] w-[120px] font-mono text-[13px]"
                          value={associateVersion}
                          onChange={(event) =>
                            setAssociateVersion(event.target.value)
                          }
                          onKeyDown={(event) => {
                            preventFormSubmit(event);
                            if (event.key === "Enter") {
                              associateSelected();
                            }
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        className="self-end"
                        aria-describedby={searchIds.hint}
                        disabled={associateMutation.isPending}
                        onClick={associateSelected}
                      >
                        <Link2 aria-hidden="true" />
                        {associateMutation.isPending
                          ? "associando..."
                          : "Associar"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {associateMutation.isError && (
                <p role="alert" className="text-xs text-destructive">
                  {associateMutation.error instanceof
                  AssociateLibraryToProjectError
                    ? associateMutation.error.message
                    : "Não foi possível associar a biblioteca ao projeto. Tente novamente."}
                </p>
              )}

              <p id={searchIds.hint} className="text-xs text-muted-foreground">
                {selectedLibrary
                  ? `${selectedLibrary.name} selecionada — escolha a categoria e a versão neste projeto, se quiser, e associe.`
                  : "Bibliotecas que já estão neste projeto não aparecem na busca."}
              </p>
            </div>
          )}

          {project && (
            <div
              role="separator"
              aria-label="ou crie uma nova"
              className="flex items-center gap-2.5"
            >
              <span className="h-px flex-1 bg-border-faint" />
              <span className="text-xs text-text-fainter">
                ou crie uma nova
              </span>
              <span className="h-px flex-1 bg-border-faint" />
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-[7px]">
              <Label
                htmlFor="create-library-name"
                className="text-[12.5px] font-medium text-secondary-foreground"
              >
                Nome da biblioteca
              </Label>
              <Input
                id="create-library-name"
                type="text"
                placeholder="drizzle-orm"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={
                  errors.name ? "create-library-name-error" : undefined
                }
                {...register("name")}
              />
              {errors.name && (
                <p
                  id="create-library-name-error"
                  className="text-xs text-destructive"
                >
                  {errors.name.message}
                </p>
              )}
            </div>

            {project && (
              <div className="flex w-[110px] flex-col gap-[7px]">
                <Label
                  htmlFor="create-library-version"
                  className="text-[12.5px] font-medium text-secondary-foreground"
                >
                  Versão
                </Label>
                <Input
                  id="create-library-version"
                  type="text"
                  autoComplete="off"
                  placeholder="opcional"
                  className="font-mono"
                  {...register("version")}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[7px]">
            <Label
              htmlFor="create-library-categoryId"
              className="text-[12.5px] font-medium text-secondary-foreground"
            >
              {project ? "Categoria no catálogo" : "Categoria"}
            </Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={categoriesQuery.isLoading}
                >
                  <SelectTrigger
                    id="create-library-categoryId"
                    aria-label={project ? "Categoria no catálogo" : "Categoria"}
                    className="h-10 rounded-lg border-input bg-surface-input px-3 text-[13.5px] text-foreground"
                  >
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesQuery.data?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {project && (
            <div className="flex flex-col gap-[7px]">
              <Label
                htmlFor="create-library-project-category"
                className="text-[12.5px] font-medium text-secondary-foreground"
              >
                Categoria neste projeto
              </Label>
              <Controller
                name="projectCategoryId"
                control={control}
                render={({ field }) => (
                  <ProjectCategorySelect
                    id="create-library-project-category"
                    aria-label="Categoria neste projeto"
                    value={field.value}
                    onValueChange={field.onChange}
                    categories={projectCategories}
                    libraryCategoryName={globalCategoryName(
                      watch("categoryId") || null,
                    )}
                    disabled={projectCategoriesQuery.isLoading}
                  />
                )}
              />
              <p className="text-xs text-text-faint">
                Lista as categorias globais e as deste projeto. Vale só para
                este projeto — não altera a biblioteca no catálogo.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-[12.5px] font-medium text-secondary-foreground">
              Tags
            </Label>
            <button
              type="button"
              disabled
              className="inline-flex w-fit items-center rounded-full border border-dashed border-checkbox-border px-2.5 py-1 text-xs text-text-faint opacity-50"
            >
              + tag
            </button>
            <p className="text-xs text-muted-foreground">
              Disponível depois de salvar a biblioteca.
            </p>
          </div>

          <div className="flex flex-col gap-[7px]">
            <Label
              htmlFor="create-library-notes"
              className="text-[12.5px] font-medium text-secondary-foreground"
            >
              Notas
            </Label>
            <Textarea
              id="create-library-notes"
              placeholder="pra que serve, quando usar"
              className="h-[76px] resize-none rounded-lg border-input bg-surface-input px-3 py-2 text-[13.5px] text-foreground"
              {...register("notes")}
            />
          </div>

          {mutation.isError && (
            <p role="alert" className="text-xs text-destructive">
              {createErrorMessage}
            </p>
          )}

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </SheetClose>
            <Button type="submit" disabled={mutation.isPending}>
              <Check />
              {mutation.isPending
                ? "salvando..."
                : project
                  ? "Criar e associar"
                  : "Salvar"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

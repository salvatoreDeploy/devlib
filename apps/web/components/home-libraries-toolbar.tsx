"use client";

import { useEffect, useRef, useState } from "react";
import { Hash, Tag } from "lucide-react";
import {
  ClearFiltersButton,
  FilterPill,
  SearchPill,
  type FilterOption,
} from "@/components/filter-pills";
import type { CatalogFacets } from "../lib/api/libraries";
import {
  hasActiveHomeFilters,
  type HomeLibrariesFilters,
  type HomeUsageFilter,
} from "../lib/home-libraries-filters";

// Barra da seção "Bibliotecas" da Home (docs/FRONTEND.md): busca + filtros
// Categoria/Uso/Tag. A busca vai pro servidor, então só é repassada 300ms
// depois da última tecla; o campo em si responde na hora (estado local).

export const SEARCH_DEBOUNCE_MS = 300;

type FilterChanges = Partial<Omit<HomeLibrariesFilters, "page">>;

type HomeLibrariesToolbarProps = {
  filters: HomeLibrariesFilters;
  // undefined enquanto carrega
  facets: CatalogFacets | undefined;
  onChange: (changes: FilterChanges) => void;
  onClear: () => void;
};

const USAGE_OPTIONS: { value: HomeUsageFilter; label: string }[] = [
  { value: "used", label: "Usadas nos meus projetos" },
  { value: "unused", label: "Não usadas" },
];

function categoryOptions(facets: CatalogFacets | undefined): FilterOption[] {
  if (!facets) {
    return [];
  }
  const options = facets.categories.map((category) => ({
    value: category.id,
    // categoria de projeto leva o projeto, pra desambiguar nomes repetidos
    label: category.projectName
      ? `${category.name} · ${category.projectName}`
      : category.name,
  }));
  return facets.hasUncategorized
    ? [...options, { value: "none", label: "Sem categoria" }]
    : options;
}

export function HomeLibrariesToolbar({
  filters,
  facets,
  onChange,
  onClear,
}: HomeLibrariesToolbarProps) {
  const [q, setQ] = useState(filters.q);
  const lastSent = useRef(filters.q);
  // onChange muda a cada render da página: o debounce lê sempre o mais
  // recente pelo ref, sem reiniciar o timer
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // mudança de fora (Limpar filtros, Voltar do navegador): o campo acompanha
  useEffect(() => {
    if (filters.q !== lastSent.current) {
      lastSent.current = filters.q;
      setQ(filters.q);
    }
  }, [filters.q]);

  useEffect(() => {
    if (q === lastSent.current) {
      return;
    }
    const timer = setTimeout(() => {
      lastSent.current = q;
      onChangeRef.current({ q });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  const categories = categoryOptions(facets);
  const tags = (facets?.tags ?? []).map((tag) => ({
    value: tag.id,
    label: tag.name,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <SearchPill
        label="Buscar no catálogo"
        placeholder="buscar no catálogo"
        value={q}
        onChange={setQ}
      />

      <FilterPill
        label="Categoria"
        icon={Tag}
        allLabel="Todas as categorias"
        options={categories}
        value={filters.category}
        disabled={categories.length === 0}
        onChange={(category) => onChange({ category })}
      />

      <FilterPill
        label="Uso"
        allLabel="Todas"
        options={USAGE_OPTIONS}
        value={filters.usage}
        formatActive={(option) => option.label}
        onChange={(usage) =>
          onChange({ usage: usage as HomeUsageFilter | null })
        }
      />

      <FilterPill
        label="Tag"
        icon={Hash}
        allLabel="Todas as tags"
        options={tags}
        value={filters.tag}
        disabled={tags.length === 0}
        onChange={(tag) => onChange({ tag })}
      />

      {hasActiveHomeFilters(filters) && (
        <ClearFiltersButton onClick={onClear} />
      )}
    </div>
  );
}

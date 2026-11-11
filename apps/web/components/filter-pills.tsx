"use client";

import { ChevronDown, Search, X, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Peças das barras de busca/filtros de listas (docs/FRONTEND.md, "Busca,
// filtros e paginação de listas"): busca em pílula, filtro em pílula com
// dropdown de escolha única e o link "Limpar filtros".

export type FilterOption = { value: string; label: string };

// Radix RadioGroup não aceita value vazio/null — sentinela pra "todas"
const ALL = "__all__";

const pillClassName =
  "inline-flex h-[34px] items-center gap-2 rounded-full border px-3.5 text-[13px] outline-none disabled:pointer-events-none disabled:opacity-50";

function pillState(active: boolean) {
  return active
    ? "border-checkbox-border bg-chip-alt text-foreground"
    : "border-input bg-card text-muted-foreground hover:text-foreground";
}

type SearchPillProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function SearchPill({
  label,
  placeholder,
  value,
  onChange,
}: SearchPillProps) {
  return (
    <label className="relative flex h-[34px] w-[200px] items-center">
      <Search
        className="pointer-events-none absolute left-3.5 size-3.5 text-text-fainter"
        aria-hidden="true"
      />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-full w-full rounded-full border bg-card pr-3.5 pl-[34px] text-[13px] text-foreground outline-none placeholder:text-text-fainter focus-visible:border-checkbox-border",
          value ? "border-checkbox-border" : "border-input",
        )}
      />
    </label>
  );
}

type FilterPillProps = {
  label: string;
  icon?: LucideIcon;
  allLabel: string;
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  // texto do botão quando há valor (padrão: "Rótulo: opção")
  formatActive?: (option: FilterOption) => string;
  disabled?: boolean;
};

export function FilterPill({
  label,
  icon: Icon,
  allLabel,
  options,
  value,
  onChange,
  formatActive = (option) => `${label}: ${option.label}`,
  disabled = false,
}: FilterPillProps) {
  const selected = options.find((option) => option.value === value);
  const text = value ? formatActive(selected ?? { value, label }) : label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(pillClassName, pillState(Boolean(value)))}
      >
        {Icon && (
          <Icon className="size-3.5 text-text-faint" aria-hidden="true" />
        )}
        {text}
        <ChevronDown
          className="size-[13px] text-text-faint"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={value ?? ALL}
          onValueChange={(next) => onChange(next === ALL ? null : next)}
        >
          <DropdownMenuRadioItem value={ALL}>{allLabel}</DropdownMenuRadioItem>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-1.5 text-[13px] text-text-faint hover:text-foreground"
    >
      <X className="size-[13px]" aria-hidden="true" />
      Limpar filtros
    </button>
  );
}

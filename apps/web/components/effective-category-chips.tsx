"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EffectiveCategory } from "../lib/api/libraries";

// Coluna Categoria da Home (docs/FRONTEND.md): lib usada nos projetos do
// usuário mostra as categorias efetivas (até 2 chips + "+N"), cada uma com
// tooltip "Categoria — projeto A, projeto B"; lib não usada mostra a global.

const MAX_CHIPS = 2;

const chipClassName =
  "inline-flex shrink-0 rounded-[6px] border border-input bg-secondary px-[9px] py-[3px] text-[12px]";

function categoryLabel(category: EffectiveCategory) {
  return category.name ?? "Sem categoria";
}

function describe(category: EffectiveCategory) {
  return `${categoryLabel(category)} — ${category.projects
    .map((project) => project.name)
    .join(", ")}`;
}

function Chip({
  label,
  tooltip,
  dim = false,
}: {
  label: string;
  tooltip?: string;
  dim?: boolean;
}) {
  const chip = (
    <span
      data-testid="category-chip"
      tabIndex={tooltip ? 0 : undefined}
      className={cn(
        chipClassName,
        dim ? "text-text-faint" : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );

  if (!tooltip) {
    return chip;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

type EffectiveCategoryChipsProps = {
  effectiveCategories: EffectiveCategory[];
  // nome da categoria global (null = sem categoria; undefined = não carregado)
  globalCategoryName: string | null | undefined;
};

export function EffectiveCategoryChips({
  effectiveCategories,
  globalCategoryName,
}: EffectiveCategoryChipsProps) {
  if (effectiveCategories.length === 0) {
    return (
      <Chip
        label={
          globalCategoryName === null
            ? "Sem categoria"
            : (globalCategoryName ?? "Categoria")
        }
      />
    );
  }

  const visible = effectiveCategories.slice(0, MAX_CHIPS);
  const hidden = effectiveCategories.slice(MAX_CHIPS);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map((category) => (
          <Chip
            key={category.id ?? "none"}
            label={categoryLabel(category)}
            tooltip={describe(category)}
          />
        ))}
        {hidden.length > 0 && (
          <Chip
            label={`+${hidden.length}`}
            tooltip={hidden.map(describe).join(" · ")}
            dim
          />
        )}
      </div>
    </TooltipProvider>
  );
}

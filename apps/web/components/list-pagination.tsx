"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react";

// Rodapé de lista paginada (docs/FRONTEND.md, "Paginação de listas"):
// "Mostrando X–Y de Z <itens>" à esquerda; "Página N de M" + « ‹ › » à direita.
// Genérico: não sabe de onde vêm os itens (cliente ou servidor).

type ListPaginationProps = {
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
  itemLabel: string;
  itemLabelSingular?: string;
  onPageChange: (page: number) => void;
};

export function ListPagination({
  page,
  pageCount,
  start,
  end,
  total,
  itemLabel,
  itemLabelSingular,
  onPageChange,
}: ListPaginationProps) {
  const label =
    total === 1 && itemLabelSingular ? itemLabelSingular : itemLabel;
  const isFirst = page <= 1;
  const isLast = page >= pageCount;

  const buttons: {
    label: string;
    icon: LucideIcon;
    target: number;
    disabled: boolean;
  }[] = [
    {
      label: "Primeira página",
      icon: ChevronsLeft,
      target: 1,
      disabled: isFirst,
    },
    {
      label: "Página anterior",
      icon: ChevronLeft,
      target: page - 1,
      disabled: isFirst,
    },
    {
      label: "Próxima página",
      icon: ChevronRight,
      target: page + 1,
      disabled: isLast,
    },
    {
      label: "Última página",
      icon: ChevronsRight,
      target: pageCount,
      disabled: isLast,
    },
  ];

  return (
    <nav
      aria-label="Paginação"
      className="flex items-center justify-between gap-4 border-t border-border-row px-[18px] py-3.5 text-[12.5px] text-text-faint"
    >
      <span>
        Mostrando {start}–{end} de {total} {label}
      </span>
      <div className="flex items-center gap-3.5">
        <span>
          Página {page} de {pageCount}
        </span>
        <div className="flex items-center gap-[5px]">
          {buttons.map(
            ({ label: buttonLabel, icon: Icon, target, disabled }) => (
              <button
                key={buttonLabel}
                type="button"
                aria-label={buttonLabel}
                disabled={disabled}
                onClick={() => onPageChange(target)}
                className="flex size-7 items-center justify-center rounded-[7px] border border-input bg-card text-muted-foreground hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </button>
            ),
          )}
        </div>
      </div>
    </nav>
  );
}

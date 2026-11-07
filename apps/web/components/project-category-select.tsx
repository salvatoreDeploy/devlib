"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Category } from "../lib/api/categories";

// Radix Select não aceita item com value "" — o padrão da biblioteca
// (categoryId null na associação) vira esse valor só dentro do form
export const LIBRARY_DEFAULT = "library-default";

export function toAssociationCategoryId(value: string): string | null {
  return value === LIBRARY_DEFAULT ? null : value;
}

type ProjectCategorySelectProps = {
  id: string;
  "aria-label": string;
  value: string;
  onValueChange: (value: string) => void;
  // globais + do projeto (GET /projects/:id/categories)
  categories: Category[];
  // null: biblioteca sem categoria global; undefined: nome ainda não carregado
  libraryCategoryName: string | null | undefined;
  disabled?: boolean;
  className?: string;
};

export function ProjectCategorySelect({
  id,
  "aria-label": ariaLabel,
  value,
  onValueChange,
  categories,
  libraryCategoryName,
  disabled,
  className,
}: ProjectCategorySelectProps) {
  const defaultLabel =
    libraryCategoryName === null
      ? "sem categoria"
      : (libraryCategoryName ?? "Categoria");

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "h-10 rounded-lg border-input bg-surface-input px-3 text-[13.5px] text-foreground",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={LIBRARY_DEFAULT}>
          Padrão da biblioteca ({defaultLabel})
        </SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

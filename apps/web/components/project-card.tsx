"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectOverview } from "@/lib/api/projects";
import { formatRelativeTime } from "@/lib/relative-time";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ProjectCardProps = {
  project: ProjectOverview;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

const LIBRARY_NAMES_PREVIEW_LIMIT = 3;

function librariesMetaLabel(project: ProjectOverview): string {
  const countLabel =
    project.librariesCount === 1
      ? "1 biblioteca"
      : `${project.librariesCount} bibliotecas`;

  if (project.libraryNames.length === 0) {
    return countLabel;
  }

  const names = project.libraryNames
    .slice(0, LIBRARY_NAMES_PREVIEW_LIMIT)
    .join(" · ");
  return `${countLabel} · ${names}`;
}

function activity(project: ProjectOverview): { action: string; date: string } {
  const wasUpdated = project.updatedAt !== project.createdAt;
  return {
    action: wasUpdated ? "atualizou o projeto" : "criou o projeto",
    date: wasUpdated ? project.updatedAt : project.createdAt,
  };
}

export function ProjectCard({
  project,
  onDelete,
  isDeleting,
}: ProjectCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { action, date } = activity(project);

  return (
    <div className="overflow-hidden rounded-[11px] border border-border bg-card hover:border-checkbox-border">
      <div className="p-[18px_18px_22px]">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/projects/${project.id}`}
            className="text-[16px] font-semibold text-foreground hover:underline"
          >
            {project.name}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-[28px] shrink-0 items-center justify-center rounded-[7px] border border-input text-text-fainter">
              ···
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}/edit`}>Editar</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  setConfirmOpen(true);
                }}
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {project.description && (
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {project.description}
          </p>
        )}

        <p className="mt-3 text-[13px] text-text-faint">
          {librariesMetaLabel(project)}
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-border-soft bg-surface-subtle px-[18px] py-3">
        <div className="size-[18px] shrink-0 rounded-full bg-track" />
        <p className="text-[12.5px]">
          <span className="font-semibold text-secondary-foreground">você</span>
          <span className="text-text-faint"> {action} </span>
          <span className="text-[12px] text-text-dim">
            {formatRelativeTime(date)}
          </span>
        </p>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &quot;{project.name}&quot;? Essa ação
            não pode ser desfeita.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                onDelete(project.id);
              }}
            >
              {isDeleting ? "excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

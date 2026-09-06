"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/api/projects";
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
  project: Project;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ProjectCard({
  project,
  onDelete,
  isDeleting,
}: ProjectCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="rounded-[11px] border border-border bg-card p-[18px_18px_22px] hover:border-checkbox-border">
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
        criado em {formatDate(project.createdAt)}
      </p>

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

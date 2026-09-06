import Link from "next/link";
import { BarChart3, Code2, List, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectTabsProps = {
  projectId: string;
};

const tabPillClasses =
  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-medium";

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  return (
    <nav className="flex gap-1.5 border-b border-border-faint px-10">
      <Link
        href={`/projects/${projectId}`}
        aria-current="page"
        className={cn(
          tabPillClasses,
          "border border-input bg-chip-alt text-foreground",
        )}
      >
        <List className="size-[15px]" aria-hidden="true" />
        Bibliotecas
      </Link>

      {[
        { label: "Categorias", icon: Tag },
        { label: "Métricas", icon: BarChart3 },
        { label: "Developers", icon: Code2 },
      ].map(({ label, icon: Icon }) => (
        <span
          key={label}
          aria-disabled="true"
          className={cn(tabPillClasses, "cursor-not-allowed text-text-faint")}
        >
          <Icon className="size-[15px]" aria-hidden="true" />
          {label}
        </span>
      ))}
    </nav>
  );
}

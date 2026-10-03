"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code, LayoutDashboard, Menu, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectTabsProps = {
  projectId: string;
};

const tabPillClasses =
  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-medium";
const activeTabClasses = "border border-input bg-chip-alt text-foreground";
const inactiveTabClasses = "text-text-faint hover:text-foreground";
const disabledTabClasses = "cursor-not-allowed text-text-faint";

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  const pathname = usePathname();

  const tabs = [
    { label: "Bibliotecas", icon: Menu, href: `/projects/${projectId}` },
    {
      label: "Categorias",
      icon: Tag,
      href: `/projects/${projectId}/categories`,
    },
  ];

  return (
    <nav className="flex gap-1.5 border-b border-border-faint px-10">
      {tabs.map(({ label, icon: Icon, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              tabPillClasses,
              isActive ? activeTabClasses : inactiveTabClasses,
            )}
          >
            <Icon className="size-[15px]" aria-hidden="true" />
            {label}
          </Link>
        );
      })}

      {[
        { label: "Métricas", icon: LayoutDashboard },
        { label: "Developers", icon: Code },
      ].map(({ label, icon: Icon }) => (
        <span
          key={label}
          aria-disabled="true"
          className={cn(tabPillClasses, disabledTabClasses)}
        >
          <Icon className="size-[15px]" aria-hidden="true" />
          {label}
        </span>
      ))}
    </nav>
  );
}

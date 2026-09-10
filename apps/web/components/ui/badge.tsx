import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Updated/Warning/Danger Badge (docs/FRONTEND.md) — paleta fixa de status.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center rounded-[6px] px-[9px] py-[3px] text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap uppercase",
  {
    variants: {
      variant: {
        updated: "bg-brand-bg text-primary",
        warning: "bg-warn-bg text-warn",
        danger: "bg-danger-bg text-destructive",
      },
    },
    defaultVariants: {
      variant: "updated",
    },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

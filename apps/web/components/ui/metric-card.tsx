import * as React from "react";

import { cn } from "@/lib/utils";

// Metric Card (docs/FRONTEND.md) — sem consumidor ainda, ganha um no
// dashboard de métricas (Sprint 7 do BACKLOG.md).
export type MetricCardProps = React.ComponentProps<"div"> & {
  label: string;
  value: string | number;
  valueClassName?: string;
};

function MetricCard({
  label,
  value,
  valueClassName,
  className,
  ...props
}: MetricCardProps) {
  return (
    <div
      data-slot="metric-card"
      className={cn(
        "flex flex-col gap-1.5 rounded-[11px] border border-border bg-card p-[18px]",
        className,
      )}
      {...props}
    >
      <p className="text-[12.5px] text-text-faint">{label}</p>
      <p
        className={cn(
          "text-[28px] font-bold tracking-[-0.02em] text-foreground",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

export { MetricCard };

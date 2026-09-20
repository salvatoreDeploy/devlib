import { ChevronDown } from "lucide-react";
import { getInitials } from "@/lib/initials";

export type ProfileButtonProps = {
  name?: string | null;
  email: string;
};

export function ProfileButton({ name, email }: ProfileButtonProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-col items-end gap-0.5">
        {name && (
          <span className="text-[13px] font-semibold text-foreground">
            {name}
          </span>
        )}
        <span className="text-[12px] text-text-faint">{email}</span>
      </div>
      <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full border border-checkbox-border bg-track">
        <span className="text-[12px] font-semibold text-text-muted">
          {getInitials(name, email)}
        </span>
      </div>
      <ChevronDown className="size-[14px] text-text-faint" aria-hidden="true" />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LogOut, UserPen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser } from "@/lib/api/users";
import { logout } from "@/lib/api/auth";
import { clearTokens, getRefreshToken } from "@/lib/auth-storage";
import type { Session } from "@/lib/session";

export type ProfileMenuProps = {
  session: Session;
};

function ProfileIdentity({ session }: ProfileMenuProps) {
  const profileQuery = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  const name = profileQuery.data?.name;
  const email = profileQuery.data?.email ?? session.email;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full border border-checkbox-border bg-track">
        <span className="text-[13px] font-semibold text-text-dim">
          {email.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {name && (
          <span className="text-[14px] font-semibold text-foreground">
            {name}
          </span>
        )}
        <span className="text-[12px] text-text-faint">{email}</span>
      </div>
    </div>
  );
}

export function ProfileMenu({ session }: ProfileMenuProps) {
  const router = useRouter();

  async function handleLogout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await logout(refreshToken);
      }
    } catch {
      // melhor esforço — a sessão local é limpa de qualquer forma
    } finally {
      clearTokens();
      router.push("/login");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 outline-none">
        <span className="text-[13px] text-secondary-foreground">
          {session.email}
        </span>
        <div className="flex size-[34px] items-center justify-center rounded-full border border-checkbox-border bg-track text-[13px] font-semibold text-foreground">
          {session.email.charAt(0).toUpperCase()}
        </div>
        <ChevronDown
          className="size-[15px] text-text-faint"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex w-[360px] flex-col gap-3.5 rounded-[11px] p-3.5">
        <ProfileIdentity session={session} />
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            className="flex h-[38px] items-center gap-2.5 rounded-[8px] border border-input bg-card px-3 text-[13px] font-medium text-secondary-foreground"
          >
            <UserPen
              className="size-[15px] text-text-faint"
              aria-hidden="true"
            />
            Editar perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex h-10 items-center gap-2.5 rounded-[8px] border border-input bg-surface-input px-3 text-[13px] font-semibold text-warn"
          onSelect={(event) => {
            event.preventDefault();
            handleLogout();
          }}
        >
          <LogOut className="size-[15px]" aria-hidden="true" />
          Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

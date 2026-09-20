"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getAccessToken } from "@/lib/auth-storage";
import { decodeAccessToken } from "@/lib/session";
import { getInitials } from "@/lib/initials";
import { ProfileMenu } from "@/components/profile-menu";

export type HeaderProps = {
  breadcrumbLabel?: string;
};

export function Header({ breadcrumbLabel }: HeaderProps) {
  const accessToken = getAccessToken();
  const session = accessToken ? decodeAccessToken(accessToken) : null;

  return (
    <header className="flex items-center justify-between px-10 py-[18px]">
      <div className="flex items-center gap-3.5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-[22px] items-center justify-center rounded-[6px] border-[1.5px] border-primary bg-background text-[11px] font-bold text-primary">
            D
          </div>
          <span className="text-[15px] font-medium text-foreground">
            devlib.dev
          </span>
          <span className="text-[10px] font-semibold tracking-[0.06em] text-text-dim">
            BETA
          </span>
        </Link>

        {breadcrumbLabel && (
          <div className="flex items-center gap-2.5">
            <span className="text-[16px] text-checkbox-border">/</span>
            <div className="flex items-center gap-2">
              <div className="flex size-[18px] items-center justify-center rounded-full border border-checkbox-border bg-track">
                <span className="text-[9px] font-semibold text-text-dim">
                  {getInitials(breadcrumbLabel, breadcrumbLabel)}
                </span>
              </div>
              <span className="text-[15px] font-medium text-foreground">
                {breadcrumbLabel}
              </span>
            </div>
            <ChevronDown
              className="size-[14px] text-text-faint"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {session && <ProfileMenu session={session} />}
    </header>
  );
}

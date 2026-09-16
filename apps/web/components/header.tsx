"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getAccessToken } from "@/lib/auth-storage";
import { decodeAccessToken } from "@/lib/session";
import { ProfileMenu } from "@/components/profile-menu";

export type HeaderProps = {
  breadcrumbLabel?: string;
};

export function Header({ breadcrumbLabel }: HeaderProps) {
  const accessToken = getAccessToken();
  const session = accessToken ? decodeAccessToken(accessToken) : null;

  return (
    <header className="flex items-center justify-between px-10 py-[18px]">
      <div className="flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-[26px] items-center justify-center rounded-[7px] border-[1.5px] border-primary text-[13px] font-bold text-primary">
            D
          </div>
          <span className="text-[15px] font-medium text-foreground">
            devlib.dev
          </span>
        </Link>

        {breadcrumbLabel && (
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] text-checkbox-border">/</span>
            <span className="text-[15px] font-medium text-foreground">
              {breadcrumbLabel}
            </span>
            <ChevronDown
              className="size-[15px] text-text-faint"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {session && <ProfileMenu session={session} />}
    </header>
  );
}

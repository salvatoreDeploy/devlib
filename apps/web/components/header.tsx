"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getAccessToken } from "@/lib/auth-storage";
import { decodeAccessToken } from "@/lib/session";

export type HeaderProps = {
  projectName?: string;
};

export function Header({ projectName }: HeaderProps) {
  const accessToken = getAccessToken();
  const session = accessToken ? decodeAccessToken(accessToken) : null;

  return (
    <header className="flex items-center justify-between px-10 py-[18px]">
      <div className="flex items-center gap-2.5">
        <Link href="/projects" className="flex items-center gap-2.5">
          <div className="flex size-[26px] items-center justify-center rounded-[7px] border-[1.5px] border-primary text-[13px] font-bold text-primary">
            D
          </div>
          <span className="text-[15px] font-medium text-foreground">
            devlib.dev
          </span>
        </Link>

        {projectName && (
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] text-checkbox-border">/</span>
            <span className="text-[15px] font-medium text-foreground">
              {projectName}
            </span>
            <ChevronDown
              className="size-[15px] text-text-faint"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {session && (
        <div className="flex items-center gap-2.5">
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
        </div>
      )}
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "./auth-storage";

export function useRequireAuth(): boolean {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      setIsAuthenticated(true);
    } else {
      router.push("/login");
    }
  }, [router]);

  return isAuthenticated;
}

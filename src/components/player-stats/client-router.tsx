"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ClientRouter() {
  const router = useRouter();

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        router.back();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [router]);

  return null;
}

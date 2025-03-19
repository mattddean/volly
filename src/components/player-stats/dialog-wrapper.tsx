"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "~/components/ui/dialog";

export function DialogWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <Dialog
      defaultOpen
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
      {children}
    </Dialog>
  );
}

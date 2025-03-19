"use client";

import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "~/components/ui/dialog";

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
      <DialogContent className="size-140">
        <VisuallyHidden>
          <DialogTitle>Player Stats</DialogTitle>
        </VisuallyHidden>

        {children}
      </DialogContent>
    </Dialog>
  );
}

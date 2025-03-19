import { DialogContent } from "~/components/ui/dialog";
import { PlayerStatsCard } from "./player-stats-card";
import { DialogCloseButton } from "./dialog-close-button";
import { Suspense } from "react";
import { Loader2Icon } from "lucide-react";
import { DialogWrapper } from "./dialog-wrapper";

export async function PlayerStatsDialog({ playerId }: { playerId: string }) {
  return (
    <DialogWrapper>
      <DialogContent className="max-w-xl">
        <DialogCloseButton />
        <Suspense
          fallback={
            <div className="flex items-center justify-center size-96">
              <Loader2Icon className="size-4 animate-spin" />
            </div>
          }
        >
          <PlayerStatsCard playerId={playerId} />
        </Suspense>
      </DialogContent>
    </DialogWrapper>
  );
}

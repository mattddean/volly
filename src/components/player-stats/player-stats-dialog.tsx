import { PlayerStatsCard } from "./player-stats-card";
import { Suspense } from "react";
import { Loader2Icon } from "lucide-react";
import { DialogWrapper } from "./dialog-wrapper";

export async function PlayerStatsDialog({ playerId }: { playerId: string }) {
  return (
    <DialogWrapper>
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        }
      >
        <PlayerStatsCard playerId={playerId} />
      </Suspense>
    </DialogWrapper>
  );
}

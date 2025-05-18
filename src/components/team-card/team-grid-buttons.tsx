"use client";

import { Loader2Icon, XIcon } from "lucide-react";
import { useTransition } from "react";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/sonner";
import type { SelectTeam, SelectUser } from "~/db/schema";
import { ClientContext, setupSync, useOperation } from "~/lib/echo/client";
import { moveToTeam } from "~/lib/operations/teams_users";
import { removeFromTeamAndCheckOutAction } from "./actions";

// todo: this setup should ideally be done once at the app level
const wasmDb = {} as any; // placeholder
const clientCtx = new ClientContext(wasmDb, {});
// todo: replace with actual WebSocket URL from env or config
const syncClient = setupSync(
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws",
);

export function MoveToTeamButton({
  team,
  user,
  tournamentId,
}: {
  team: SelectTeam;
  user: SelectUser;
  tournamentId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { execute: executeMoveToTeam } = useOperation(
    moveToTeam,
    syncClient,
    clientCtx,
  );

  const onClick = () => {
    startTransition(async () => {
      try {
        const result = await executeMoveToTeam({
          newTeamId: team.id,
          userId: user.id,
          tournamentId,
        });
        // Assuming the operation returns { success: true, ... } on success
        // and throws an error or returns an error object on failure.
        // The current echo operation returns the input on success, so we check for that.
        if (result) {
          toast.success("Moved to team");
        } else {
          // if the operation itself doesn't throw but returns an error structure:
          // toast.error(result.error?.message || "Failed to move team");
          // For now, assuming errors are thrown by execute or syncClient
          toast.error(
            "Failed to move team. Error not explicitly provided by operation result.",
          );
        }
      } catch (error) {
        // console.error("MoveToTeamButton Error:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to move team",
        );
      }
    });
  };

  return (
    <Button type="button" onClick={onClick} loading={isPending}>
      Move to team {team.name}
    </Button>
  );
}

export function CheckOutButton({
  user,
  tournamentId,
}: {
  user: SelectUser;
  tournamentId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await removeFromTeamAndCheckOutAction({
        userId: user.id,
        tournamentId,
      });
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success(
          `${user.name} has been removed from their team and checked out`,
        );
      }
    });
  };

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={onClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <XIcon className="size-4" />
      )}
      Remove and Check Out
    </Button>
  );
}

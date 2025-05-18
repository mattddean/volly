"use client";

import { Loader2Icon, XIcon } from "lucide-react";
import { useTransition } from "react";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/sonner";
import type { SelectTeam, SelectUser } from "~/db/schema";
import { useOperation } from "~/lib/echo/client/helpers";
import { moveToTeam } from "~/lib/echo/operations/teams-users";
import { removeFromTeamAndCheckOutAction } from "./actions";

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
  const moveToTeamOp = useOperation(moveToTeam);

  const onClick = () => {
    startTransition(async () => {
      // TODO: simplify error handling; probably integrate with useMutation from react-query
      try {
        const result = await moveToTeamOp.execute({
          newTeamId: team.id,
          userId: user.id,
          tournamentId,
        });
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

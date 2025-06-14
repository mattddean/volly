"use client";

import type { SelectTeam, SelectUser } from "~/db/schema";
import { Button } from "~/components/ui/button";
import { useTransition } from "react";
import { moveToTeamAction, removeFromTeamAndCheckOutAction } from "./actions";
import { toast } from "~/components/ui/sonner";
import { Loader2Icon, XIcon } from "lucide-react";

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

  const onClick = () => {
    startTransition(async () => {
      const result = await moveToTeamAction({
        newTeamId: team.id,
        userId: user.id,
        tournamentId,
      });
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success("Moved to team");
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

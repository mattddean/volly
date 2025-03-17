"use client";

import type { SelectTeam, SelectUser } from "~/db/schema";
import { Button } from "~/components/ui/button";
import { useTransition } from "react";
import { moveToTeamAction, removeFromTeamAndCheckOutAction } from "./actions";
import { toast } from "~/components/ui/sonner";

export function MoveToTeamButton({
  team,
  user,
  workbookId,
}: {
  team: SelectTeam;
  user: SelectUser;
  workbookId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await moveToTeamAction({
        newTeamId: team.id,
        userId: user.id,
        workbookId: Number(workbookId),
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
  workbookId,
}: {
  user: SelectUser;
  workbookId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await removeFromTeamAndCheckOutAction({
        userId: user.id,
        workbookId: Number(workbookId),
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
      loading={isPending}
    >
      Remove and Check Out
    </Button>
  );
}

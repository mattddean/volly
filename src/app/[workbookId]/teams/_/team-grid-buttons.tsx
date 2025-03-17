"use client";

import type { SelectTeam, SelectUser } from "~/db/schema";
import { Button } from "~/components/ui/button";
import { useTransition } from "react";
import { moveToTeam, removeFromTeamAndCheckOut } from "./actions";
import { Loader2Icon } from "lucide-react";

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
      await moveToTeam({
        newTeamId: team.id,
        userId: user.id,
        workbookId: Number(workbookId),
      });
    });
  };

  return (
    <Button type="button" onClick={onClick}>
      Move to team {team.name}
      {isPending && <Loader2Icon className="size-4 ml-2" />}
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
      await removeFromTeamAndCheckOut({
        userId: user.id,
        workbookId: Number(workbookId),
      });
    });
  };

  return (
    <Button type="button" onClick={onClick}>
      Check out
      {isPending && <Loader2Icon className="size-4 ml-2" />}
    </Button>
  );
}

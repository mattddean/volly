"use client";

import { useTransition } from "react";
import { Button } from "~/components/ui/button";
import { checkInAllPlayersAction, deleteCheckinAction } from "./actions";
import { toast } from "~/components/ui/sonner";
import { Loader2Icon, XIcon } from "lucide-react";

export function CheckInAllPlayersButton({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const [isPending, startTransition] = useTransition();
  function onClick() {
    startTransition(async () => {
      const result = await checkInAllPlayersAction({ tournamentId });
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success("Checked in all players");
      }
    });
  }

  return (
    <Button type="button" onClick={onClick} loading={isPending}>
      Check in all Players
    </Button>
  );
}

export function DeleteCheckInButton({
  checkin,
  tournamentId,
}: {
  checkin: { id: string; user: { name: string } };
  tournamentId: string;
}) {
  const [isPending, startTransition] = useTransition();
  function onClick() {
    startTransition(async () => {
      const result = await deleteCheckinAction({
        checkinId: checkin.id,
        tournamentId,
      });
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success(`${checkin.user.name} has been checked out`);
      }
    });
  }

  return (
    <Button
      variant="destructive"
      size="icon"
      onClick={onClick}
      className="size-7"
      disabled={isPending}
    >
      {isPending ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <XIcon className="size-4" />
      )}
    </Button>
  );
}

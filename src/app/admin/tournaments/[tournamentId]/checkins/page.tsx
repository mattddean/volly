import { eq, isNull } from "drizzle-orm";
import { checkinsTable, tournamentsTable } from "~/db/schema";
import { db } from "~/db";
import { notFound } from "next/navigation";
import { CheckInAllPlayersButton, DeleteCheckInButton } from "./_/buttons";
import { TournamentNav } from "../_/tournament-template";
import { Suspense } from "react";

interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function TournamentCheckinsPage(props: Props) {
  return (
    <Suspense>
      <Suspended {...props} />
    </Suspense>
  );
}

async function Suspended({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const tournament = await db.query.tournamentsTable.findFirst({
    where: eq(tournamentsTable.id, tournamentId),
    with: {
      checkins: {
        where: isNull(checkinsTable.checkedOutAt),
        with: { user: true },
      },
    },
  });
  if (!tournament) notFound();

  return (
    <>
      <TournamentNav tournamentId={tournamentId} />

      <div className="flex flex-col items-center justify-center h-full gap-y-4">
        <h1 className="text-2xl font-bold">Checked in Players</h1>

        <ul className="flex flex-col gap-y-2">
          {tournament.checkins.map((checkin) => (
            <li
              key={checkin.id}
              className="flex justify-between items-center gap-x-4"
            >
              {checkin.user.name}
              <DeleteCheckInButton
                checkin={checkin}
                tournamentId={tournamentId}
              />
            </li>
          ))}
        </ul>

        <CheckInAllPlayersButton tournamentId={tournamentId} />

        <div className="h-4" />
      </div>
    </>
  );
}

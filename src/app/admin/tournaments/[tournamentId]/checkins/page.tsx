import { eq, isNull } from "drizzle-orm";
import { checkinsTable, tournamentsTable } from "~/db/schema";
import { db } from "~/db";
import { notFound } from "next/navigation";
import { CheckInAllPlayersButton, DeleteCheckInButton } from "./_/buttons";
import { Suspense } from "react";
import { FullPageLoading } from "~/components/full-page-loading";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function TournamentCheckinsPage(props: Props) {
  return (
    <Suspense fallback={<FullPageLoading />}>
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
      <div className="flex flex-col items-center justify-center h-full gap-y-4">
        <Button asChild variant="link">
          <Link href={`/tournaments/${tournamentId}/check-in`} target="_blank">
            Check in new players <ExternalLinkIcon className="size-4" />
          </Link>
        </Button>
        <h2 className="text-2xl font-bold">Checked in Players</h2>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y divide-sky-200 divide-x">
          {tournament.checkins.map((checkin) => (
            <li
              key={checkin.id}
              className="flex justify-between items-center gap-x-4 p-3"
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

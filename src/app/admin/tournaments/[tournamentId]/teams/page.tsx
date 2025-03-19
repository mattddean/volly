import { Suspense } from "react";
import { TournamentTemplate } from "../_/tournament-template";
import { FullPageLoading } from "~/components/full-page-loading";
import { db } from "~/db";
import { eq } from "drizzle-orm";
import { teamsTable } from "~/db/schema";
import { TeamCard } from "~/components/team-card";

interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function TournamentTeamsPage(props: Props) {
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

  const teams = await db.query.teamsTable.findMany({
    where: eq(teamsTable.tournamentId, tournamentId),
    with: { users: { with: { user: true } } },
    orderBy: [teamsTable.id], // we created the teams in order, so we can sort by id
  });

  return (
    <>
      <TournamentTemplate tournamentId={tournamentId} />

      <div className="flex flex-col gap-y-8 px-16 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              otherTeams={teams}
              tournamentId={tournamentId}
              teamColor="yellow"
            />
          ))}
        </div>
      </div>
    </>
  );
}

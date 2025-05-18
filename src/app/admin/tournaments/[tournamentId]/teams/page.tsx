import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { FullPageLoading } from "~/components/full-page-loading";
import { TeamCard } from "~/components/team-card";
import { db } from "~/db";
import { teamsTable } from "~/db/schema";

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
      <div className="flex flex-col gap-y-8 px-16 py-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

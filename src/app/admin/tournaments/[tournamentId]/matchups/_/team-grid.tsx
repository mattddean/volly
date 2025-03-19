import { matchupsTable, teamsTable } from "~/db/schema";
import { db } from "~/db";
import { eq } from "drizzle-orm";
import { TeamCard } from "~/components/team-card";

export async function TeamGrid({ tournamentId }: { tournamentId: string }) {
  const teams = await db.query.teamsTable.findMany({
    where: eq(teamsTable.tournamentId, tournamentId),
    with: { users: { with: { user: true } } },
  });

  const matchups = await db.query.matchupsTable.findMany({
    where: eq(matchupsTable.tournamentId, tournamentId),
    with: {
      team1: { with: { users: { with: { user: true } } } },
      team2: { with: { users: { with: { user: true } } } },
    },
    orderBy: [matchupsTable.roundNumber, matchupsTable.id],
  });

  // Group matchups by round
  const roundsMap = matchups.reduce((acc, matchup) => {
    const round = matchup.roundNumber ?? 1;
    if (!acc.has(round)) {
      acc.set(round, []);
    }
    acc.get(round)?.push(matchup);
    return acc;
  }, new Map<number, typeof matchups>());

  const rounds = Array.from(roundsMap.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="space-y-8">
      {rounds.length > 0 ? (
        rounds.map(([roundNumber, roundMatchups]) => (
          <div key={roundNumber} className="space-y-4">
            <h2 className="text-xl font-semibold bg-sky-100 text-sky-800 inline-block px-4 py-2 rounded-lg">
              Round {roundNumber}
            </h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {roundMatchups.map((matchup) => (
                <div
                  key={matchup.id}
                  className="border border-gray-200 rounded-lg p-6 shadow bg-sky-green-light"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {/* Team 1 */}
                    <div className="flex-1 w-full">
                      <TeamCard
                        team={matchup.team1}
                        otherTeams={teams}
                        tournamentId={tournamentId}
                        teamColor="sky"
                      />
                    </div>

                    {/* VS Divider */}
                    <div className="self-center flex-shrink-0 py-2">
                      <div className="bg-sky-green-gradient text-white rounded-full px-3 py-1 font-bold">
                        VS
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div className="flex-1 w-full">
                      <TeamCard
                        team={matchup.team2}
                        otherTeams={teams}
                        tournamentId={tournamentId}
                        teamColor="green"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        // Fallback to original grid if no matchups
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.map((team, index) => (
            <TeamCard
              key={team.id}
              team={team}
              otherTeams={teams}
              tournamentId={tournamentId}
              teamColor={index % 2 === 0 ? "sky" : "green"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

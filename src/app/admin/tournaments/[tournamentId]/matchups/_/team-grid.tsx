import {
  matchupsTable,
  type SelectTeam,
  type SelectTeamUser,
  type SelectUser,
  teamsTable,
} from "~/db/schema";
import { db } from "~/db";
import { eq } from "drizzle-orm";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { EllipsisVerticalIcon } from "lucide-react";
import { CheckOutButton, MoveToTeamButton } from "./team-grid-buttons";

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

function TeamCard({
  team,
  otherTeams,
  tournamentId,
  teamColor = "sky",
}: {
  team:
    | (SelectTeam & {
        users: (SelectTeamUser & { user: SelectUser | null })[];
      })
    | null;
  otherTeams: SelectTeam[];
  tournamentId: string;
  teamColor?: "sky" | "green";
}) {
  if (!team) return null;

  const colorClasses = {
    sky: {
      header: "bg-sky-100 text-sky-800",
      border: "border-sky-200",
      card: "bg-white shadow-sky",
      stats: "bg-sky-50 text-sky-700",
    },
    green: {
      header: "bg-green-100 text-green-800",
      border: "border-green-200",
      card: "bg-white shadow-green",
      stats: "bg-green-50 text-green-700",
    },
  };

  const colors = colorClasses[teamColor];

  return (
    <div
      className={`rounded-lg p-4 shadow-sm h-full border ${colors.border} ${colors.card}`}
    >
      <div className="flex flex-col gap-1 mb-3">
        <div
          className={`text-lg font-medium rounded px-2 py-1 ${colors.header}`}
        >
          {team.name}
        </div>

        {/* Team Stats */}
        {(team.normalizedAvgZScore !== null || team.chemistry !== null) && (
          <div
            className={`text-sm rounded px-2 py-1 flex justify-between ${colors.stats}`}
          >
            {team.normalizedAvgZScore !== null && (
              <div
                className="flex items-center gap-1"
                title="Team Normalized Z-Score"
              >
                <span>⚡</span>
                <span>{team.normalizedAvgZScore.toFixed(1)}</span>
              </div>
            )}
            {team.chemistry !== null && (
              <div className="flex items-center gap-1" title="Team Chemistry">
                <span>🤝</span>
                <span>{team.chemistry.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="divide-input divide-y">
        {team.users.map((user) => {
          const usr = user.user;
          return (
            <div
              className="py-1 flex justify-between items-center"
              key={user.userId}
            >
              <div className="whitespace-nowrap">{usr?.name}</div>
              {usr && (
                <Popover>
                  <PopoverTrigger
                    type="button"
                    className="cursor-pointer size-4"
                  >
                    <EllipsisVerticalIcon className="size-full" />
                  </PopoverTrigger>
                  <PopoverContent className="flex flex-col gap-y-2">
                    {otherTeams.map((t) => {
                      return (
                        <MoveToTeamButton
                          key={t.id}
                          team={t}
                          user={usr}
                          tournamentId={tournamentId}
                        />
                      );
                    })}
                    <CheckOutButton user={usr} tournamentId={tournamentId} />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

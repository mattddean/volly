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

export async function TeamGrid({ workbookId }: { workbookId: string }) {
  const teams = await db.query.teamsTable.findMany({
    where: eq(teamsTable.workbookId, Number(workbookId)),
    with: { users: { with: { user: true } } },
  });

  const matchups = await db.query.matchupsTable.findMany({
    where: eq(matchupsTable.workbookId, Number(workbookId)),
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
            <h2 className="text-xl font-semibold">Round {roundNumber}</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {roundMatchups.map((matchup) => (
                <div
                  key={matchup.id}
                  className="border border-accent rounded-lg p-6 shadow bg-card"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Team 1 */}
                    <div className="flex-1 w-full">
                      <TeamCard
                        team={matchup.team1}
                        otherTeams={teams}
                        workbookId={workbookId}
                      />
                    </div>

                    {/* VS Divider */}
                    <div className="flex-shrink-0 py-2">
                      <div className="bg-primary text-primary-foreground rounded-full px-3 py-1 font-bold">
                        VS
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div className="flex-1 w-full">
                      <TeamCard
                        team={matchup.team2}
                        otherTeams={teams}
                        workbookId={workbookId}
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
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              otherTeams={teams}
              workbookId={workbookId}
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
  workbookId,
}: {
  team:
    | (SelectTeam & {
        users: (SelectTeamUser & { user: SelectUser | null })[];
      })
    | null;
  otherTeams: SelectTeam[];
  workbookId: string;
}) {
  if (!team) return null;

  return (
    <div className="rounded-lg p-4 shadow-sm h-full">
      <div className="text-lg font-medium mb-2">{team.name}</div>
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
                          workbookId={workbookId}
                        />
                      );
                    })}
                    <CheckOutButton user={usr} workbookId={workbookId} />
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

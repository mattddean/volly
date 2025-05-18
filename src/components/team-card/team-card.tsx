import { EllipsisVerticalIcon } from "lucide-react";
import {
  CheckOutButton,
  MoveToTeamButton,
} from "~/components/team-card/team-grid-buttons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { SelectTeam, SelectTeamUser, SelectUser } from "~/db/schema";
import { PlayerStatsTrigger } from "../player-stats/player-stats-trigger";

export function TeamCard({
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
  teamColor?: "sky" | "green" | "yellow";
}) {
  if (!team) return null;

  const colorClasses: Record<
    TeamColor,
    { header: string; border: string; card: string; stats: string }
  > = {
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
    yellow: {
      header: "bg-yellow-100 text-yellow-800",
      border: "border-yellow-200",
      card: "bg-white shadow-yellow",
      stats: "bg-yellow-50 text-yellow-700",
    },
  };

  const colors = colorClasses[teamColor];

  return (
    <div
      className={`h-full rounded-lg border p-4 shadow-sm ${colors.border} ${colors.card}`}
    >
      <div className="mb-3 flex flex-col gap-1">
        <div
          className={`rounded px-2 py-1 font-medium text-lg ${colors.header}`}
        >
          {team.name}
        </div>

        {/* Team Stats */}
        {(team.normalizedAvgZScore !== null || team.chemistry !== null) && (
          <div
            className={`flex justify-between rounded px-2 py-1 text-sm ${colors.stats}`}
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
      <div className="divide-y divide-input">
        {team.users.map((user) => {
          const usr = user.user;
          return (
            <div
              className="flex items-center justify-between py-1"
              key={user.userId}
            >
              {usr && (
                <PlayerStatsTrigger playerId={usr?.id}>
                  <div className="whitespace-nowrap">{usr?.name}</div>
                </PlayerStatsTrigger>
              )}

              {usr && (
                <Popover>
                  <PopoverTrigger
                    type="button"
                    className="size-4 cursor-pointer"
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

type TeamColor = "sky" | "green" | "yellow";

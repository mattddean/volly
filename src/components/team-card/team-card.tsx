import type { SelectTeam, SelectTeamUser, SelectUser } from "~/db/schema";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { EllipsisVerticalIcon } from "lucide-react";
import {
  CheckOutButton,
  MoveToTeamButton,
} from "~/components/team-card/team-grid-buttons";

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

import { format } from "date-fns";
import { db } from "~/db";
import { eq } from "drizzle-orm";
import { usersTable } from "~/db/schema";

export async function PlayerStatsCard({ playerId }: { playerId: string }) {
  const player = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, playerId),
  });

  if (!player) {
    return null;
  }

  const colorClasses = {
    header: "bg-red-100 text-red-800",
    border: "border-red-200",
    card: "bg-white shadow-red",
    stats: "bg-red-50 text-red-700",
  };

  return (
    <div
      className={`rounded-lg p-4 shadow-sm h-full border ${colorClasses.border} ${colorClasses.card}`}
    >
      <div className="flex flex-col gap-4">
        {/* Player Name */}
        <div
          className={`text-xl font-medium rounded px-3 py-2 ${colorClasses.header}`}
        >
          {player.name}
        </div>

        {/* Player Stats */}
        <div className="space-y-4">
          {/* Skill Stats */}
          <div
            className={`rounded p-3 flex flex-col gap-2 ${colorClasses.stats}`}
          >
            <h3 className="font-semibold">Skill Rating</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-red-500 font-medium">Skill Group:</span>{" "}
                {player.skillGroup || "Not set"}
              </div>
              <div>
                <span className="text-red-500 font-medium">Z-Score:</span>{" "}
                {player.zScore?.toFixed(1) || "Not set"}
              </div>
              <div>
                <span className="text-red-500 font-medium">Uncertainty:</span>{" "}
                {player.sigma?.toFixed(1) || "Not set"}
              </div>
              <div>
                <span className="text-red-500 font-medium">Last Played:</span>{" "}
                {player.lastPlayedDay
                  ? format(new Date(player.lastPlayedDay), "MMM d, yyyy")
                  : "Never"}
              </div>
            </div>
          </div>

          {/* Game Stats */}
          <div
            className={`rounded p-3 flex flex-col gap-2 ${colorClasses.stats}`}
          >
            <h3 className="font-semibold">Game Stats</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-red-500 font-medium">Games Played:</span>{" "}
                {player.gamesPlayed || 0}
              </div>
              <div>
                <span className="text-red-500 font-medium">Wins:</span>{" "}
                {player.wins || 0}
              </div>
              <div>
                <span className="text-red-500 font-medium">Win Rate:</span>{" "}
                {player.gamesPlayed
                  ? `${((player.wins / player.gamesPlayed) * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
              <div>
                <span className="text-red-500 font-medium">Points:</span>{" "}
                {player.pointsScored || 0} scored / {player.pointsAllowed || 0}{" "}
                allowed
              </div>
            </div>
          </div>

          {/* Chemistry would be shown here if we had the data */}
          {/* <div
            className={`rounded p-3 flex flex-col gap-2 ${colorClasses.stats}`}
          >
            <h3 className="font-semibold">Chemistry with Other Players</h3>
            <div className="grid grid-cols-1 gap-1">
              {/* We would map through chemistry relationships here */}
          {/* </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}

// bun run src/app/scripts/seed-users.ts

import { db } from "../../db";
import { usersTable } from "../../db/schema";
import { loadPlayersFromCSV } from "../../utils/file-utils";
import { format as formatDate } from "date-fns";

async function main() {
  const players = loadPlayersFromCSV("./players.csv");

  const users = Object.values(players).map((player) => ({
    ...player,
  }));

  await db.insert(usersTable).values(
    users.map((user) => ({
      gamesPlayed: user.gamesPlayed,
      lastPlayed: formatDate(user.lastPlayed, "yyyy-MM-dd"),
      name: user.name,
      skillGroup: user.skillGroup,
      zScore: user.zScore,
      sigma: user.sigma,
      pointsAllowed: user.pointsAllowed,
      pointsScored: user.pointsScored,
      wins: user.wins,
    })),
  );
}

main().catch(console.error);

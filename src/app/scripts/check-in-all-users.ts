// bun run src/app/scripts/check-in-all-users.ts

import { db } from "~/db";
import { checkinsTable } from "~/db/schema";

async function main() {
  const users = await db.query.usersTable.findMany();

  await db.insert(checkinsTable).values(
    users.map((user) => ({
      userId: user.id,
      tournamentId: "1", // change this to the appropriate tournament id
    })),
  );
}

main().catch(console.error);

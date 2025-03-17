// bun run src/app/scripts/checkin-all-users.ts

import { db } from "~/db";
import { checkinsTable } from "~/db/schema";

async function main() {
  const users = await db.query.usersTable.findMany();

  await db.insert(checkinsTable).values(
    users.map((user) => ({
      attendeeSetId: 1,
      userId: user.id,
    }))
  );
}

main().catch(console.error);

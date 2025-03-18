import { eq } from "drizzle-orm";
import { attendeeSetsTable } from "../../db/schema";
import { db } from "../../db";

export default async function TournamentHomePage() {
  const attendeeSet = await db.query.attendeeSetsTable.findFirst({
    where: eq(attendeeSetsTable.tournamentId, 1),
    with: {
      checkins: { with: { user: true } },
    },
  });

  const users = attendeeSet?.checkins.map((checkin) => checkin.user);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen">
      <h1 className="text-2xl font-bold">Checkins</h1>
      <ul>
        {users?.map((user) => (
          <li key={user?.id}>{user?.name}</li>
        ))}
      </ul>
    </div>
  );
}

import { eq } from "drizzle-orm";
import { tournamentsTable } from "~/db/schema";
import { db } from "~/db";

export default async function TournamentHomePage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const tournament = await db.query.tournamentsTable.findFirst({
    where: eq(tournamentsTable.id, tournamentId),
    with: {
      checkins: { with: { user: true } },
    },
  });

  const users = tournament?.checkins.map((checkin) => checkin.user);

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

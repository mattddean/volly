import { eq, inArray } from "drizzle-orm";
import {
  attendeeSetsTable,
  checkinsTable,
  teamsTable,
  usersTable,
} from "~/db/schema";
import { db } from "~/db";
import { GenerateTeamsForm } from "./_/form";

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ workbookId: string }>;
}) {
  const workbookId = (await params).workbookId;

  const teams = await db.query.teamsTable.findMany({
    where: eq(teamsTable.workbookId, Number(workbookId)),
    with: { users: { with: { user: true } } },
  });

  const attendeeSet = await db.query.attendeeSetsTable.findFirst({
    where: eq(attendeeSetsTable.workbookId, Number(workbookId)),
  });

  const checkins = await db.query.checkinsTable.findMany({
    where: eq(checkinsTable.attendeeSetId, attendeeSet?.id ?? 0),
  });

  const users = await db.query.usersTable.findMany({
    where: inArray(
      usersTable.id,
      checkins.map((checkin) => checkin.userId),
    ),
  });

  return (
    <div>
      <div>
        {teams.map((team) => {
          return (
            <div key={team.id}>
              <div>{team.name}</div>
              <div>{team.users.map((user) => user.user?.name)}</div>
            </div>
          );
        })}
      </div>
      <GenerateTeamsForm />
    </div>
  );
}

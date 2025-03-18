import { db } from "~/db";
import { CheckinForm } from "./_/form";

export default async function Checkin({
  params,
}: {
  params: Promise<{ workbookId: string }>;
}) {
  const { workbookId } = await params;
  const users = await db.query.usersTable.findMany();

  return <CheckinForm users={users} workbookId={workbookId} />;
}

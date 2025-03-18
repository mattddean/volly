import { db } from "~/db";
import { CheckInForm } from "./_/form";

export default async function CheckIn({
  params,
}: {
  params: Promise<{ workbookId: string }>;
}) {
  const { workbookId } = await params;
  const users = await db.query.usersTable.findMany();

  return <CheckInForm users={users} workbookId={workbookId} />;
}

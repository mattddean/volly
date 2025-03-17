import { db } from "~/db";
import { CheckinForm } from "./_/form";

export default async function Checkin() {
  const users = await db.query.usersTable.findMany();

  return <CheckinForm users={users} />;
}

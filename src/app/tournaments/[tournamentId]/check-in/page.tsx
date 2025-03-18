import { db } from "~/db";
import { CheckInForm } from "./_/form";
import { Suspense } from "react";
import { FullPageLoading } from "~/components/full-page-loading";
interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function CheckIn(props: Props) {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <Suspended {...props} />
    </Suspense>
  );
}

async function Suspended({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const users = await db.query.usersTable.findMany();

  return <CheckInForm users={users} tournamentId={tournamentId} />;
}

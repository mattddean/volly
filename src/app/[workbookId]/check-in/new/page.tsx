import { CheckinForm } from "./_/form";

export default async function Checkin({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  return <CheckinForm tournamentId={tournamentId} />;
}

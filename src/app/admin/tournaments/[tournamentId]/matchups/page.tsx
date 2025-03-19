import { GenerateTeamsForm } from "./_/form";
import { TeamGrid } from "./_/team-grid";
import { Suspense } from "react";
import { FullPageLoading } from "~/components/full-page-loading";

interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function TournamentMatchupsPage(props: Props) {
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
  const tournamentId = (await params).tournamentId;

  return (
    <>
      <div className="flex flex-col gap-y-12 px-16">
        <GenerateTeamsForm tournamentId={tournamentId}>
          <Suspense fallback={<FullPageLoading />}>
            <TeamGrid tournamentId={tournamentId} />
          </Suspense>
        </GenerateTeamsForm>
      </div>
    </>
  );
}

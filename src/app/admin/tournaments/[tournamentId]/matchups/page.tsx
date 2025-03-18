import { Loader2Icon } from "lucide-react";
import { GenerateTeamsForm } from "./_/form";
import { TeamGrid } from "./_/team-grid";
import { Suspense } from "react";
import { TournamentNav } from "../_/tournament-template";

interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function TournamentMatchupsPage(props: Props) {
  return (
    <Suspense>
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
      <TournamentNav tournamentId={tournamentId} />

      <div className="flex flex-col gap-y-12 px-16">
        <GenerateTeamsForm tournamentId={tournamentId}>
          <Suspense
            fallback={
              <div className="size-full flex items-center justify-center">
                <Loader2Icon className="size-6 animate-spin" />
              </div>
            }
          >
            <TeamGrid tournamentId={tournamentId} />
          </Suspense>
        </GenerateTeamsForm>
      </div>
    </>
  );
}

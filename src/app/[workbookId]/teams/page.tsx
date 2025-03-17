import { Loader2Icon } from "lucide-react";
import { GenerateTeamsForm } from "./_/form";
import { TeamGrid } from "./_/team-grid";
import { Suspense } from "react";

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ workbookId: string }>;
}) {
  const workbookId = (await params).workbookId;

  return (
    <div className="flex flex-col gap-y-12 px-16">
      <div className="h-12" />
      <GenerateTeamsForm workbookId={workbookId}>
        <Suspense
          fallback={
            <div className="size-full flex items-center justify-center">
              <Loader2Icon className="size-6 animate-spin" />
            </div>
          }
        >
          <TeamGrid workbookId={workbookId} />
        </Suspense>
      </GenerateTeamsForm>
    </div>
  );
}

import { eq } from "drizzle-orm";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "~/db";
import { tournamentsTable } from "~/db/schema";

export async function TournamentTemplate({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const tournament = await db.query.tournamentsTable.findFirst({
    where: eq(tournamentsTable.id, tournamentId),
  });
  if (!tournament) notFound();

  return (
    <div className="relative">
      {/* Floating Navigation Bar */}
      <div className="sticky top-5 z-10">
        <div className="justify-between max-w-[900px] items-center mx-auto bg-sky-green-light shadow-md p-4 rounded-lg flex flex-wrap gap-4 border border-gray-200">
          <div className="flex items-center gap-x-2">
            <Link
              href={"/admin"}
              className="flex items-center justify-center bg-sky-700 text-white size-8 rounded-md transition-colors hover:bg-sky-800"
            >
              <ArrowLeftIcon className="size-6" />
            </Link>

            <h1 className="text-center whitespace-nowrap text-lg font-bold text-sky-700">
              Tournament {tournament.name}
            </h1>
          </div>

          <div className="flex justify-center gap-3">
            <Link
              href={`/admin/tournaments/${tournamentId}/checkins`}
              className="px-4 py-2 bg-green-gradient text-white rounded-md transition-colors hover:from-[var(--green-700)] hover:to-[var(--green-700)]"
            >
              Checkins
            </Link>
            <Link
              href={`/admin/tournaments/${tournamentId}/teams`}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md transition-colors hover:bg-yellow-600"
            >
              Teams
            </Link>
            <Link
              href={`/admin/tournaments/${tournamentId}/matchups`}
              className="px-4 py-2 bg-sky-gradient text-white rounded-md transition-colors hover:from-[var(--sky-700)] hover:to-[var(--sky-700)]"
            >
              Matchups
            </Link>
          </div>
        </div>
        <div className="h-26" />
      </div>
    </div>
  );
}

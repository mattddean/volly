import { Button } from "~/components/ui/button";
import { db } from "~/db";
import { TournamentForm } from "./_/form";
import Link from "next/link";
import { Suspense } from "react";

export default async function Home() {
  return (
    <Suspense>
      <Suspended />
    </Suspense>
  );
}

async function Suspended() {
  const tournaments = await db.query.tournamentsTable.findMany();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="space-y-6 bg-sky-green-light p-6 rounded-lg border border-gray-200 shadow-md">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <div className="flex flex-col gap-y-2">
          {tournaments.map((tournament) => (
            <Button key={tournament.id} asChild>
              <Link href={`/admin/tournaments/${tournament.id}/checkins`}>
                {tournament.name}
              </Link>
            </Button>
          ))}
        </div>

        <TournamentForm />
      </div>
    </div>
  );
}

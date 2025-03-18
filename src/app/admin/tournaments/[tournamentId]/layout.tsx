export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  return (
    <div className="relative">
      {/* Floating Navigation Bar */}
      <div className="justify-center max-w-md mx-auto sticky top-0 z-10 bg-sky-green-light shadow-md p-4 mb-6 rounded-lg flex flex-wrap gap-3 border border-gray-200">
        <h1 className="text-lg font-bold mb-4 text-sky-700">
          Tournament {tournamentId}
        </h1>

        <a
          href={`/admin/tournaments/${tournamentId}/teams`}
          className="px-4 py-2 bg-sky-gradient text-white rounded-md transition-colors hover:from-[var(--sky-700)] hover:to-[var(--sky-700)]"
        >
          Teams
        </a>
        <a
          href={`/admin/tournaments/${tournamentId}/checkins`}
          className="px-4 py-2 bg-green-gradient text-white rounded-md transition-colors hover:from-[var(--green-700)] hover:to-[var(--green-700)]"
        >
          Checkins
        </a>
      </div>

      {children}
    </div>
  );
}

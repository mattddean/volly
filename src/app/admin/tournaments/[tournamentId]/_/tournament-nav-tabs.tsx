"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "~/lib/utils";

export function TournamentNavTabs({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Checkins",
      href: `/admin/tournaments/${tournamentId}/checkins`,
      baseColor: "green",
    },
    {
      name: "Teams",
      href: `/admin/tournaments/${tournamentId}/teams`,
      baseColor: "yellow",
    },
    {
      name: "Matchups",
      href: `/admin/tournaments/${tournamentId}/matchups`,
      baseColor: "sky",
    },
  ];

  return (
    <div className="flex justify-center gap-6">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-2 py-2 transition-colors relative font-medium",
              tab.baseColor === "green" &&
                (isActive
                  ? "text-green-700"
                  : "text-gray-500 hover:text-green-600"),
              tab.baseColor === "yellow" &&
                (isActive
                  ? "text-yellow-700"
                  : "text-gray-500 hover:text-yellow-600"),
              tab.baseColor === "sky" &&
                (isActive
                  ? "text-sky-700"
                  : "text-gray-500 hover:text-sky-600"),
            )}
          >
            {tab.name}
            {isActive && (
              <span
                className={cn(
                  "absolute bottom-0 left-0 h-0.5 w-full",
                  tab.baseColor === "green" && "bg-green-600",
                  tab.baseColor === "yellow" && "bg-yellow-600",
                  tab.baseColor === "sky" && "bg-sky-600",
                )}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}

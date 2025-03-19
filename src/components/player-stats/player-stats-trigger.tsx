import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "~/components/ui/button";

interface PlayerStatsTriggerProps extends ComponentProps<typeof Button> {
  playerId: string;
  children: React.ReactNode;
}

export function PlayerStatsTrigger({
  playerId,
  children,
  ...props
}: PlayerStatsTriggerProps) {
  return (
    <Button type="button" variant="ghost" asChild {...props}>
      <Link href={`/player/${playerId}`} prefetch>
        {children}
      </Link>
    </Button>
  );
}

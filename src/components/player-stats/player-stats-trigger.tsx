"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const onClick = () => {
    router.push(`/player/${playerId}`, { scroll: false });
  };

  return (
    <Button onClick={onClick} type="button" variant="ghost" {...props}>
      {children}
    </Button>
  );
}

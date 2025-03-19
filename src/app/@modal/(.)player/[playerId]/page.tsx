import { PlayerStatsDialog } from "~/components/player-stats/player-stats-dialog";

interface Props {
  params: { playerId: string };
}

export default async function InterceptedPlayerModal({ params }: Props) {
  const { playerId } = await params;

  return <PlayerStatsDialog playerId={playerId} />;
}

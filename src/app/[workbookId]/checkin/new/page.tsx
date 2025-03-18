import { CheckinForm } from "./_/form";

export default async function Checkin({
  params,
}: {
  params: Promise<{ workbookId: string }>;
}) {
  const { workbookId } = await params;

  return <CheckinForm workbookId={workbookId} />;
}

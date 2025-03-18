import { Loader2Icon } from "lucide-react";

export async function FullPageLoading() {
  "use cache";

  return (
    <div className="flex items-center justify-center w-full h-screen">
      <Loader2Icon className="size-6 animate-spin text-sky-600" />
    </div>
  );
}

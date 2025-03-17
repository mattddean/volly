import { teamsTable } from "~/db/schema";
import { db } from "../../../../db";
import { eq } from "drizzle-orm";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { EllipsisVerticalIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

export async function TeamGrid({ workbookId }: { workbookId: string }) {
  const teams = await db.query.teamsTable.findMany({
    where: eq(teamsTable.workbookId, Number(workbookId)),
    with: { users: { with: { user: true } } },
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {teams.map((team) => {
        return (
          <div key={team.id} className="border rounded-lg p-4 shadow-sm">
            <div className="text-lg">{team.name}</div>
            <div className="divide-accent divide-y">
              {team.users.map((user) => {
                return (
                  <div className="py-1 flex justify-between" key={user.userId}>
                    <div className="whitespace-nowrap">{user.user?.name}</div>
                    <Popover>
                      <PopoverTrigger
                        type="button"
                        className="cursor-pointer size-4"
                      >
                        <EllipsisVerticalIcon className="size-full" />
                      </PopoverTrigger>
                      <PopoverContent>
                        <Button type="button">Move</Button>
                        <Button type="button">Move</Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

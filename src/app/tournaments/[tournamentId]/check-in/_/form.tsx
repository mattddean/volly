"use client";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { type CheckinSchema, checkinSchema } from "./schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormLabel,
  FormItem,
  FormMessage,
  FormField,
} from "~/components/ui/form";
import { checkInAction } from "./actions";
import type { SelectUser } from "~/db/schema";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "~/components/ui/sonner";
import { useTransition } from "react";

export function CheckInForm({
  users,
  tournamentId,
}: {
  users: SelectUser[];
  tournamentId: string;
}) {
  console.debug({ users, tournamentId });
  const form = useForm<CheckinSchema>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      userId: "",
      tournamentId,
    },
  });

  const [isPending, startTransition] = useTransition();
  function onSubmit(data: CheckinSchema) {
    startTransition(async () => {
      const response = await checkInAction(data);
      if (response.error) {
        toast.error(response.error.message);
      } else {
        toast.success("You're checked in!");
      }
    });
  }

  const pathname = usePathname();

  return (
    <Form {...form}>
      <div className="justify-center items-center flex h-full min-h-screen">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 w-full max-w-sm bg-sky-green-light p-6 rounded-lg border border-gray-200 shadow-md"
        >
          <h3 className="text-xl font-bold text-sky-700">Check In</h3>

          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-sky-700">Name</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="w-full border-sky-200 focus:border-[var(--sky-500)] focus:ring-[var(--sky-500)]">
                      <SelectValue placeholder="Select your name" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-x-2">
            <Button
              className="bg-sky-gradient text-white hover:bg-sky-600"
              loading={isPending}
            >
              Check in
            </Button>
            <Button
              variant="outline"
              asChild
              type="button"
              className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
            >
              <Link href={`${pathname}/new`}>I&rsquo;m new!</Link>
            </Button>
          </div>
        </form>
      </div>
    </Form>
  );
}

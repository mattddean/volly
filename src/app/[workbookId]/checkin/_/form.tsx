"use client";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { CheckinSchema, checkinSchema } from "./schemas";
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
import { checkin } from "./actions";
import { SelectUser } from "~/db/schema";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "~/components/ui/sonner";

export function CheckinForm({ users }: { users: SelectUser[] }) {
  const form = useForm<CheckinSchema>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      userId: "0",
    },
  });

  async function onSubmit(data: CheckinSchema) {
    const response = await checkin(data);
    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success("You're checked in!");
    }
  }

  const pathname = usePathname();

  return (
    <Form {...form}>
      <div className="justify-center items-center flex h-full min-h-screen">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 w-full max-w-sm"
        >
          <div>Please find yourself in this list</div>
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Name</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a verified email to display" />
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
            <Button>Check in</Button>
            <Button variant="secondary" asChild type="button">
              <Link href={`${pathname}/new`}>I&rsquo;m new</Link>
            </Button>
          </div>
        </form>
      </div>
    </Form>
  );
}

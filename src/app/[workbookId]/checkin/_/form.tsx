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

export function CheckinForm({ users }: { users: SelectUser[] }) {
  const form = useForm<CheckinSchema>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      userId: "0",
    },
  });

  async function onSubmit(data: CheckinSchema) {
    await checkin(data);
  }

  return (
    <Form {...form}>
      <div>Please find yourself in this list</div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value.toString()}
              >
                <FormControl>
                  <SelectTrigger>
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

        <Button variant="secondary">I&rsquo;m new</Button>
      </form>
    </Form>
  );
}

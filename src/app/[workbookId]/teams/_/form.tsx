"use client";

import { Button } from "~/components/ui/button";
import { GenerateTeamsSchema, generateTeamsSchema } from "./schemas";
import { Input } from "~/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormLabel,
  FormItem,
  FormMessage,
  FormField,
} from "~/components/ui/form";
import { createTeamsAndMatchupsAction } from "./actions";
import { toast } from "~/components/ui/sonner";

export function GenerateTeamsForm() {
  const form = useForm<GenerateTeamsSchema>({
    resolver: zodResolver(generateTeamsSchema),
    defaultValues: {
      teamSize: 6,
      scheduleRounds: 3,
    },
  });

  async function onSubmit(data: GenerateTeamsSchema) {
    await createTeamsAndMatchupsAction(data);
    toast.success("Matchups generated!");
  }

  return (
    <Form {...form}>
      <div className="justify-center items-center flex h-full min-h-screen">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="teamSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team Size</FormLabel>
                <Input type="number" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scheduleRounds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Rounds</FormLabel>
                <Input type="number" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <Button>Generate Teams</Button>
        </form>
      </div>
    </Form>
  );
}

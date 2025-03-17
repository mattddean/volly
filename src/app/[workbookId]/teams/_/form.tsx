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
import { createTeamsAndMatchups } from "./actions";
import type { SelectUser } from "~/db/schema";
import { useState } from "react";
import { Player } from "../../../../models/player";

export function GenerateTeamsForm({ users }: { users: SelectUser[] }) {
  const form = useForm<GenerateTeamsSchema>({
    resolver: zodResolver(generateTeamsSchema),
    defaultValues: {
      teamSize: 6,
      scheduleRounds: 3,
    },
  });

  const [teams, setTeams] = useState<Player[][]>([]);

  async function onSubmit(data: GenerateTeamsSchema) {
    const teams = await createTeamsAndMatchups(data);
    setTeams(teams);
  }

  return (
    <Form {...form}>
      <div>Please find yourself in this list</div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
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

        <Button variant="secondary">Generate Teams</Button>
      </form>

      {JSON.stringify(teams)}
    </Form>
  );
}

"use client";

import { Button } from "~/components/ui/button";
import { type GenerateTeamsSchema, generateTeamsSchema } from "./schemas";
import { Input } from "~/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormLabel,
  FormItem,
  FormMessage,
  FormField,
  FormControl,
} from "~/components/ui/form";
import { createTeamsAndMatchupsAction } from "./actions";
import { toast } from "~/components/ui/sonner";
import { useTransition, type ReactNode } from "react";
import { Loader2Icon } from "lucide-react";

export function GenerateTeamsForm({
  children,
  workbookId,
}: { children: ReactNode; workbookId: string }) {
  const form = useForm<GenerateTeamsSchema>({
    resolver: zodResolver(generateTeamsSchema),
    defaultValues: {
      teamSize: 6,
      scheduleRounds: 3,
      workbookId,
    },
  });

  const [isPending, startTransition] = useTransition();

  async function onSubmit(data: GenerateTeamsSchema) {
    startTransition(async () => {
      const result = await createTeamsAndMatchupsAction(data);
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success(`Built ${result.data.numTeams} Teams!`);
      }
    });
  }

  return (
    <>
      <Form {...form}>
        <div className="justify-center items-center flex h-full">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="teamSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Size</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        // convert from string to number
                        field.onChange(Number(e.target.value));
                      }}
                    />
                  </FormControl>
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
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        // convert from string to number
                        field.onChange(Number(e.target.value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button loading={isPending}>Build Matchups</Button>
          </form>
        </div>
      </Form>
      {isPending ? (
        <div className="size-full flex items-center justify-center">
          <Loader2Icon className="size-6 animate-spin" />
        </div>
      ) : (
        children
      )}
    </>
  );
}

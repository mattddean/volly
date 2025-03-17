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
} from "~/components/ui/form";
import { createTeamsAndMatchupsAction } from "./actions";
import { toast } from "~/components/ui/sonner";
import { useTransition, type ReactNode } from "react";
import { Loader2Icon } from "lucide-react";

export function GenerateTeamsForm({ children }: { children: ReactNode }) {
  const form = useForm<GenerateTeamsSchema>({
    resolver: zodResolver(generateTeamsSchema),
    defaultValues: {
      teamSize: 6,
      scheduleRounds: 3,
    },
  });

  const [isPending, startTransition] = useTransition();

  async function onSubmit(data: GenerateTeamsSchema) {
    startTransition(async () => {
      await createTeamsAndMatchupsAction(data);
      toast.success("Matchups generated!");
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

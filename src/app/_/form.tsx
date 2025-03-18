"use client";

import { Button } from "~/components/ui/button";
import { type NewTournamentSchema, newTournamentSchema } from "./schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "~/components/ui/form";
import { createTournamentAction } from "./actions";
import { toast } from "~/components/ui/sonner";
import { useTransition } from "react";

export function TournamentForm() {
  const form = useForm<NewTournamentSchema>({
    resolver: zodResolver(newTournamentSchema),
    defaultValues: {},
  });

  const [isPending, startTransition] = useTransition();
  function onSubmit(data: NewTournamentSchema) {
    startTransition(async () => {
      const result = await createTournamentAction(data);
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success("Tournament Created!");
      }
    });
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Button
            loading={isPending}
            className="bg-sky-green-gradient hover:from-[var(--sky-700)] hover:to-[var(--green-700)] text-white"
          >
            New Tournament
          </Button>
        </form>
      </Form>
    </>
  );
}

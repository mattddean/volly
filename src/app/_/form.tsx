"use client";

import { Button } from "~/components/ui/button";
import { type NewTournamentSchema, newTournamentSchema } from "./schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "~/components/ui/form";
import { createTournamentAction } from "./actions";
import { toast } from "~/components/ui/sonner";
import { useTransition, type ReactNode } from "react";
import { Loader2Icon } from "lucide-react";

export function TournamentForm({ children }: { children?: ReactNode }) {
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
        <div className="justify-center items-center flex h-full min-h-screen">
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 bg-sky-green-light p-6 rounded-lg border border-gray-200 shadow-md"
          >
            <Button
              loading={isPending}
              className="bg-sky-green-gradient hover:from-[var(--sky-700)] hover:to-[var(--green-700)] text-white"
            >
              New Tournament
            </Button>
          </form>
        </div>
      </Form>
      {isPending ? (
        <div className="size-full flex items-center justify-center">
          <Loader2Icon className="size-6 animate-spin text-sky-600" />
        </div>
      ) : (
        children
      )}
    </>
  );
}

"use client";

import { Button } from "~/components/ui/button";
import { type NewUserSchema, newUserSchema } from "./schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormLabel,
  FormItem,
  FormMessage,
  FormField,
} from "~/components/ui/form";
import { createUser } from "./actions";
import { Input } from "~/components/ui/input";
import { toast } from "~/components/ui/sonner";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTransition } from "react";

export function CheckinForm() {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  const form = useForm<NewUserSchema>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      name: "",
      tournamentId,
    },
  });

  const [isPending, startTransition] = useTransition();
  function onSubmit(data: NewUserSchema) {
    startTransition(async () => {
      const result = await createUser(data);
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success("You're checked in!");
      }
    });
  }

  const pathname = usePathname();
  const checkinPath = pathname.split("/new")[0];

  return (
    <Form {...form}>
      <div className="justify-center items-center flex h-full min-h-screen">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 w-full max-w-sm bg-sky-green-light p-6 rounded-lg border border-gray-200 shadow-md"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-green-700">
                  Please enter your full name
                </FormLabel>
                <Input
                  {...field}
                  className="border-green-200 focus:border-[var(--green-500)] focus:ring-[var(--green-500)]"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-x-2">
            <Button className="bg-green-gradient text-white hover:bg-green-600">
              Check in
            </Button>
            <Button
              variant="outline"
              asChild
              type="button"
              className="border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
              loading={isPending}
            >
              <Link href={checkinPath}>Back</Link>
            </Button>
          </div>
        </form>
      </div>
    </Form>
  );
}

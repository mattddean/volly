"use client";

import { Button } from "~/components/ui/button";
import { NewUserSchema, newUserSchema } from "./schemas";
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

export function CheckinForm() {
  const form = useForm<NewUserSchema>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(data: NewUserSchema) {
    await createUser(data);
  }

  return (
    <Form {...form}>
      <div className="justify-center items-center flex h-full min-h-screen">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 w-full max-w-sm"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Please enter your full name</FormLabel>
                <Input {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-x-2">
            <Button>Submit</Button>
          </div>
        </form>
      </div>
    </Form>
  );
}

import { z } from "zod";

export const newUserSchema = z.object({
  name: z.string(),
});

export type NewUserSchema = z.infer<typeof newUserSchema>;

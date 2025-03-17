import { z } from "zod";

export const checkinSchema = z.object({
  userId: z.string(),
});

export type CheckinSchema = z.infer<typeof checkinSchema>;

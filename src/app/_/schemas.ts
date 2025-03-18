import { z } from "zod";

export const newWorkbookSchema = z.object({});

export type NewWorkbookSchema = z.infer<typeof newWorkbookSchema>;

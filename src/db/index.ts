import { drizzle } from "drizzle-orm/node-postgres";
import * as relations from "./relations";
import * as schema from "./schema";

export const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  },
  schema: { ...schema, ...relations },
});

// Make sure to install the 'pg' package
import { drizzle } from "drizzle-orm/node-postgres";
import * as relations from "./relations";
import * as schema from "./schema";

// You can specify any property from the node-postgres connection options
export const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  },
  schema: { ...schema, ...relations },
});

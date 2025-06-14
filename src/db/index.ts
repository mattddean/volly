import { drizzle } from 'drizzle-orm/node-postgres';
import * as relations from './relations';
import * as schema from './schema';

export const db = drizzle({
  connection: {
    connectionString: process.env.ZERO_UPSTREAM_DB,
    ssl: false,
  },
  schema: { ...schema, ...relations },
});

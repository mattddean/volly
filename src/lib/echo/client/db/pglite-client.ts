export { PgDialect } from "drizzle-orm/pg-core";

import { drizzle as PgLiteDrizzle } from "drizzle-orm/pglite";
import migrations from "./migrations/export.json";
import * as schema from "./schema";

export { schema };
export const frontMigrations = migrations;

export const createPgLiteClient = (client: any) => {
  return PgLiteDrizzle(client, {
    schema,
  });
};

export * as users from "../services/users";

export default createPgLiteClient;

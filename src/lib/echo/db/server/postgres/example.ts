import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import { defineOperation } from "~/lib/echo/core"; // adjust path as needed
import { ServerContext } from "~/lib/echo/server"; // adjust path as needed
import { createPostgresAdapter } from "./adapter";

// example schema definition using drizzle
const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tournamentId: text("tournament_id").notNull(),
  createdAt: timestamp("created_at").notNull(),
  version: integer("version").notNull().default(1),
});

const schema = { teams };

// example operation
const getTeamById = defineOperation({
  name: "getTeamById",
  schema: teams, // you might link to the Drizzle table object or a custom schema representation
  input: z.object({ id: z.string() }),
  execute: async (ctx, input: { id: string }) => {
    return ctx.db.teams.get(input.id);
  },
});

// example usage
// biome-ignore lint/correctness/noUnusedVariables: example file
async function usePostgresServerExample() {
  // connection string for your postgres database
  const connectionString =
    process.env.DATABASE_URL || "postgresql://user:password@host:port/database";

  // create the adapter
  const adapter = await createPostgresAdapter(connectionString, schema);

  // create a server context using our database adapter
  const serverCtx = new ServerContext(adapter.tables, schema);

  try {
    // example: using a defined operation
    const team = await getTeamById.execute(serverCtx, { id: "some-team-id" });
    console.log("Fetched team:", team);

    // example: direct table usage
    const newTeam = await serverCtx.db.teams.insert({
      id: crypto.randomUUID(),
      name: "Team Server",
      tournamentId: "tournament-server-123",
      createdAt: new Date(), // PGLite adapter example used Date.now()
      version: 1,
    });
    console.log("Inserted team directly:", newTeam);
  } catch (error) {
    console.error("Error in PostgreSQL server example:", error);
  } finally {
    // release the client connection when done
    await adapter.release();
    // close the pool if the application is shutting down
    await adapter.pool.end();
  }
}

// to run this example:
// ensure DATABASE_URL is set in your environment or replace the connection string
// usePostgresServerExample().catch(console.error);

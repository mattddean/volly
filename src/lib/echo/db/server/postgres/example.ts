import { text, integer, pgTable } from "drizzle-orm/pg-core";
import { createPostgresAdapter } from "./adapter";
import { ServerContext } from "../../../../server"; // adjust path as needed
import { defineOperation } from "../../../../core"; // adjust path as needed
import { z } from "zod";

// example schema definition using drizzle
const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tournamentId: text("tournament_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  version: integer("version").notNull().default(1),
});

const schema = { teams };

// example operation
const getTeamById = defineOperation({
  name: "getTeamById",
  schema: teams, // you might link to the Drizzle table object or a custom schema representation
  input: z.object({ id: z.string() }),
  execute: async (ctx, input) => {
    return ctx.db.teams.get(input.id);
  },
});

// example usage
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

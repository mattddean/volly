import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { ClientContext } from "../../../client";
import { createPgLiteAdapter } from "./adapter";

// example schema definition using drizzle
const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tournamentId: text("tournament_id").notNull(),
  createdAt: integer("created_at").notNull(),
  version: integer("version").notNull().default(1),
});

// example usage
async function usePgLiteExample() {
  // create the database schema for drizzle
  const schema = { teams };

  // create the adapter
  const { tables } = createPgLiteAdapter("pglite://demo-db", schema);

  // create a client context using our database adapter
  const clientCtx = new ClientContext(tables, schema);

  // now we can use our client context with optimistic updates
  // this same code will work with any adapter (server or client)

  // insert a new team
  const newTeam = await clientCtx.db.teams.insert({
    id: crypto.randomUUID(),
    name: "Team Alpha",
    tournamentId: "tournament-123",
    createdAt: Date.now(),
    version: 1,
  });
  console.log("Inserted team:", newTeam);

  // query teams
  const allTeams = await clientCtx.db.teams.findMany({
    where: { tournamentId: "tournament-123" },
    orderBy: { createdAt: "desc" },
  });
  console.log("All teams:", allTeams);

  // update a team
  const updatedTeam = await clientCtx.db.teams.update(newTeam.id, {
    name: "Team Alpha Renamed",
    version: newTeam.version + 1,
  });
  console.log("Updated team:", updatedTeam);

  // delete a team
  await clientCtx.db.teams.delete(newTeam.id);
  console.log("Team deleted");
}

// Execute the example function in a real app
// usePgLiteExample().catch(console.error);

import { relations } from "drizzle-orm";
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { ulid } from "~/lib/ulid";

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(ulid),
  name: text("name").notNull(),
  skillGroup: text("skill_group").notNull(),
  zScore: integer("z_score").notNull(),
  sigma: integer("sigma").notNull(),
  /** yyyy-MM-dd */
  lastPlayedDay: text("last_played_day").notNull(),
  gamesPlayed: integer("games_played").notNull(),
  wins: integer("wins").notNull(),
  pointsScored: integer("points_scored").notNull(),
  pointsAllowed: integer("points_allowed").notNull(),
});

export const userChemistriesTable = sqliteTable("user_chemistries", {
  id: text("id").primaryKey().$defaultFn(ulid),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  withUserId: text("with_user_id")
    .notNull()
    .references(() => usersTable.id),
  chemistry: text("chemistry").notNull(),
});

export const tournamentsTable = sqliteTable("tournaments", {
  id: text("id").primaryKey().$defaultFn(ulid),
  name: text("name").notNull(),
  day: text("day"),
});

export const teamsTable = sqliteTable("teams", {
  id: text("id").primaryKey().$defaultFn(ulid),
  name: text("name").notNull(),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournamentsTable.id),
  avgZScore: integer("avg_z_score"),
  normalizedAvgZScore: integer("normalized_avg_z_score"),
  chemistry: integer("chemistry"),
});

export const checkinsTable = sqliteTable(
  "checkins",
  {
    id: text("id").primaryKey().$defaultFn(ulid),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournamentsTable.id),
    checkedOutAt: text("checked_out_at"),
  },
  (t) => [unique().on(t.tournamentId, t.userId)],
);

export const teamsUsersTable = sqliteTable(
  "teams_users",
  {
    id: text("id").primaryKey().$defaultFn(ulid),
    teamId: text("team_id")
      .notNull()
      .references(() => teamsTable.id, {
        onDelete: "cascade",
      }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournamentsTable.id),
  },
  (t) => [
    unique().on(t.teamId, t.userId),
    unique().on(t.userId, t.tournamentId),
  ],
);

export const matchupsTable = sqliteTable("matchups", {
  id: text("id").primaryKey().$defaultFn(ulid),
  team1Id: text("team1_id")
    .notNull()
    .references(() => teamsTable.id, {
      onDelete: "cascade",
    }),
  team2Id: text("team2_id")
    .notNull()
    .references(() => teamsTable.id, {
      onDelete: "cascade",
    }),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournamentsTable.id),
  roundNumber: integer("round_number").notNull(),
});

export const gamesTable = sqliteTable("games", {
  id: text("id").primaryKey().$defaultFn(ulid),
  matchupId: text("matchup_id")
    .notNull()
    .references(() => matchupsTable.id),
  team1Id: text("team1_id")
    .notNull()
    .references(() => teamsTable.id),
  team2Id: text("team2_id")
    .notNull()
    .references(() => teamsTable.id),
  team1Score: integer("team1_score").notNull(),
  team2Score: integer("team2_score").notNull(),
  day: text("day").notNull(),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournamentsTable.id),
});

export const gamesRelations = relations(gamesTable, ({ one }) => ({
  matchup: one(matchupsTable, {
    fields: [gamesTable.matchupId],
    references: [matchupsTable.id],
    relationName: "matchupsGames",
  }),
}));

export const matchupsRelations = relations(matchupsTable, ({ one }) => ({
  games: one(gamesTable, {
    fields: [matchupsTable.id],
    references: [gamesTable.matchupId],
    relationName: "matchupsGames",
  }),
  team1: one(teamsTable, {
    fields: [matchupsTable.team1Id],
    references: [teamsTable.id],
    relationName: "teamsMatchups1",
  }),
  team2: one(teamsTable, {
    fields: [matchupsTable.team2Id],
    references: [teamsTable.id],
    relationName: "teamsMatchups2",
  }),
}));

export const teamsRelations = relations(teamsTable, ({ many }) => ({
  matchups1: many(matchupsTable, {
    relationName: "teamsMatchups1",
  }),
  matchups2: many(matchupsTable, {
    relationName: "teamsMatchups2",
  }),
  users: many(teamsUsersTable),
}));

export const teamsUsersRelations = relations(teamsUsersTable, ({ one }) => ({
  team: one(teamsTable, {
    fields: [teamsUsersTable.teamId],
    references: [teamsTable.id],
  }),
  user: one(usersTable, {
    fields: [teamsUsersTable.userId],
    references: [usersTable.id],
  }),
}));

export const checkinsRelations = relations(checkinsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [checkinsTable.userId],
    references: [usersTable.id],
  }),
  tournament: one(tournamentsTable, {
    fields: [checkinsTable.tournamentId],
    references: [tournamentsTable.id],
  }),
}));

export const tournamentsRelations = relations(tournamentsTable, ({ many }) => ({
  checkins: many(checkinsTable),
}));

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertTeam = typeof teamsTable.$inferInsert;
export type SelectTeam = typeof teamsTable.$inferSelect;

export type InsertTeamUser = typeof teamsUsersTable.$inferInsert;
export type SelectTeamUser = typeof teamsUsersTable.$inferSelect;

export type InsertMatchup = typeof matchupsTable.$inferInsert;
export type SelectMatchup = typeof matchupsTable.$inferSelect;

export type InsertGame = typeof gamesTable.$inferInsert;
export type SelectGame = typeof gamesTable.$inferSelect;

export type InsertCheckin = typeof checkinsTable.$inferInsert;
export type SelectCheckin = typeof checkinsTable.$inferSelect;

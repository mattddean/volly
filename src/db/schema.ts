import { relations } from "drizzle-orm";
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: integer("id").primaryKey(),
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
  id: integer("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  withUserId: integer("with_user_id").references(() => usersTable.id),
  chemistry: text("chemistry").notNull(),
});

export const tournamentsTable = sqliteTable("tournaments", {
  id: integer("id").primaryKey(),
});

export const teamsTable = sqliteTable("teams", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournamentsTable.id),
});

export const attendeeSetsTable = sqliteTable("attendee_sets", {
  id: integer("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournamentsTable.id),
});

export const checkinsTable = sqliteTable(
  "checkins",
  {
    id: integer("id").primaryKey(),
    attendeeSetId: integer("attendee_set_id").references(
      () => attendeeSetsTable.id,
    ),
    userId: integer("user_id").references(() => usersTable.id),
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournamentsTable.id),
    checkedOutAt: text("checked_out_at"),
  },
  (t) => [unique().on(t.attendeeSetId, t.userId)],
);

export const teamsUsersTable = sqliteTable(
  "teams_users",
  {
    id: integer("id").primaryKey(),
    teamId: integer("team_id").references(() => teamsTable.id, {
      onDelete: "cascade",
    }),
    userId: integer("user_id").references(() => usersTable.id),
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournamentsTable.id),
  },
  (t) => [
    unique().on(t.teamId, t.userId),
    unique().on(t.userId, t.tournamentId),
  ],
);

export const matchupsTable = sqliteTable("matchups", {
  id: integer("id").primaryKey(),
  team1Id: integer("team1_id").references(() => teamsTable.id, {
    onDelete: "cascade",
  }),
  team2Id: integer("team2_id").references(() => teamsTable.id, {
    onDelete: "cascade",
  }),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournamentsTable.id),
  roundNumber: integer("round_number"),
});

export const gamesTable = sqliteTable("games", {
  id: integer("id").primaryKey(),
  matchupsId: integer("matchups_id").references(() => matchupsTable.id),
  team1Id: integer("team1_id").references(() => teamsTable.id),
  team2Id: integer("team2_id").references(() => teamsTable.id),
  team1Score: integer("team1_score").notNull(),
  team2Score: integer("team2_score").notNull(),
  day: text("day").notNull(),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournamentsTable.id),
});

export const gamesRelations = relations(gamesTable, ({ one }) => ({
  matchup: one(matchupsTable, {
    fields: [gamesTable.matchupsId],
    references: [matchupsTable.id],
  }),
}));

export const matchupsRelations = relations(matchupsTable, ({ one }) => ({
  games: one(gamesTable, {
    fields: [matchupsTable.id],
    references: [gamesTable.matchupsId],
  }),
  team1: one(teamsTable, {
    fields: [matchupsTable.team1Id],
    references: [teamsTable.id],
  }),
  team2: one(teamsTable, {
    fields: [matchupsTable.team2Id],
    references: [teamsTable.id],
  }),
}));

export const teamsRelations = relations(teamsTable, ({ many }) => ({
  matchups: many(matchupsTable),
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

export const attendeeSetsRelations = relations(
  attendeeSetsTable,
  ({ many }) => ({
    checkins: many(checkinsTable),
  }),
);

export const checkinsRelations = relations(checkinsTable, ({ one }) => ({
  attendeeSet: one(attendeeSetsTable, {
    fields: [checkinsTable.attendeeSetId],
    references: [attendeeSetsTable.id],
  }),
  user: one(usersTable, {
    fields: [checkinsTable.userId],
    references: [usersTable.id],
  }),
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

export type InsertAttendeeSet = typeof attendeeSetsTable.$inferInsert;
export type SelectAttendeeSet = typeof attendeeSetsTable.$inferSelect;

export type InsertCheckin = typeof checkinsTable.$inferInsert;
export type SelectCheckin = typeof checkinsTable.$inferSelect;

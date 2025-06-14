import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { ulid } from '~/db/ulid';

export const usersTable = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(ulid),
  name: text('name').notNull(),
  skillGroup: text('skill_group').notNull(),
  zScore: integer('z_score').notNull(),
  sigma: integer('sigma').notNull(),
  /** yyyy-MM-dd */
  lastPlayedDay: date('last_played_day').notNull(),
  gamesPlayed: integer('games_played').notNull(),
  wins: integer('wins').notNull(),
  pointsScored: integer('points_scored').notNull(),
  pointsAllowed: integer('points_allowed').notNull(),
});

export const userChemistriesTable = pgTable('user_chemistries', {
  id: text('id').primaryKey().$defaultFn(ulid),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id),
  withUserId: text('with_user_id')
    .notNull()
    .references(() => usersTable.id),
  chemistry: text('chemistry').notNull(),
});

export const tournamentsTable = pgTable('tournaments', {
  id: text('id').primaryKey().$defaultFn(ulid),
  name: text('name').notNull(),
  day: date('day'),
});

export const teamsTable = pgTable('teams', {
  id: text('id').primaryKey().$defaultFn(ulid),
  name: text('name').notNull(),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournamentsTable.id),
  avgZScore: integer('avg_z_score'),
  normalizedAvgZScore: integer('normalized_avg_z_score'),
  chemistry: integer('chemistry'),
});

export const checkinsTable = pgTable(
  'checkins',
  {
    id: text('id').primaryKey().$defaultFn(ulid),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournamentsTable.id),
    checkedOutAt: timestamp('checked_out_at'),
  },
  (t) => [unique().on(t.tournamentId, t.userId)],
);

export const teamsUsersTable = pgTable(
  'teams_users',
  {
    id: text('id').primaryKey().$defaultFn(ulid),
    teamId: text('team_id')
      .notNull()
      .references(() => teamsTable.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournamentsTable.id),
  },
  (t) => [
    unique().on(t.teamId, t.userId),
    unique().on(t.userId, t.tournamentId),
  ],
);

export const matchupsTable = pgTable('matchups', {
  id: text('id').primaryKey().$defaultFn(ulid),
  team1Id: text('team1_id')
    .notNull()
    .references(() => teamsTable.id, {
      onDelete: 'cascade',
    }),
  team2Id: text('team2_id')
    .notNull()
    .references(() => teamsTable.id, {
      onDelete: 'cascade',
    }),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournamentsTable.id),
  roundNumber: integer('round_number').notNull(),
});

export const gamesTable = pgTable('games', {
  id: text('id').primaryKey().$defaultFn(ulid),
  matchupId: text('matchup_id')
    .notNull()
    .references(() => matchupsTable.id),
  team1Id: text('team1_id')
    .notNull()
    .references(() => teamsTable.id),
  team2Id: text('team2_id')
    .notNull()
    .references(() => teamsTable.id),
  team1Score: integer('team1_score').notNull(),
  team2Score: integer('team2_score').notNull(),
  day: date('day').notNull(),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournamentsTable.id),
});

export const messagesTable = pgTable('messages', {
  id: varchar('id').primaryKey().$defaultFn(ulid),
  senderId: varchar('sender_id').references(() => usersTable.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

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

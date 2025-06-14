import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { ulid } from '~/db/ulid';

export const user_chemistries = pgTable('user_chemistries', {
  id: text('id').primaryKey().$defaultFn(ulid),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  withUserId: text('with_user_id')
    .notNull()
    .references(() => users.id),
  chemistry: text('chemistry').notNull(),
});

export const tournaments = pgTable('tournaments', {
  id: text('id').primaryKey().$defaultFn(ulid),
  name: text('name').notNull(),
  day: date('day'),
});

export const teams = pgTable('teams', {
  id: text('id').primaryKey().$defaultFn(ulid),
  name: text('name').notNull(),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournaments.id),
  avgZScore: integer('avg_z_score'),
  normalizedAvgZScore: integer('normalized_avg_z_score'),
  chemistry: integer('chemistry'),
});

export const checkins = pgTable(
  'checkins',
  {
    id: text('id').primaryKey().$defaultFn(ulid),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournaments.id),
    checkedOutAt: timestamp('checked_out_at'),
  },
  (t) => [unique().on(t.tournamentId, t.userId)],
);

export const teams_users = pgTable(
  'teams_users',
  {
    id: text('id').primaryKey().$defaultFn(ulid),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournaments.id),
  },
  (t) => [
    unique().on(t.teamId, t.userId),
    unique().on(t.userId, t.tournamentId),
  ],
);

export const matchups = pgTable('matchups', {
  id: text('id').primaryKey().$defaultFn(ulid),
  team1Id: text('team1_id')
    .notNull()
    .references(() => teams.id, {
      onDelete: 'cascade',
    }),
  team2Id: text('team2_id')
    .notNull()
    .references(() => teams.id, {
      onDelete: 'cascade',
    }),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournaments.id),
  roundNumber: integer('round_number').notNull(),
});

export const games = pgTable('games', {
  id: text('id').primaryKey().$defaultFn(ulid),
  matchupId: text('matchup_id')
    .notNull()
    .references(() => matchups.id),
  team1Id: text('team1_id')
    .notNull()
    .references(() => teams.id),
  team2Id: text('team2_id')
    .notNull()
    .references(() => teams.id),
  team1Score: integer('team1_score').notNull(),
  team2Score: integer('team2_score').notNull(),
  day: date('day').notNull(),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournaments.id),
});

export const messages = pgTable('messages', {
  id: varchar('id').primaryKey().$defaultFn(ulid),
  senderId: varchar('sender_id').references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// better-auth

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),

  // custom
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

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp('updated_at').$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const jwkss = pgTable('jwkss', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

// types

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertTeam = typeof teams.$inferInsert;
export type SelectTeam = typeof teams.$inferSelect;

export type InsertTeamUser = typeof teams_users.$inferInsert;
export type SelectTeamUser = typeof teams_users.$inferSelect;

export type InsertMatchup = typeof matchups.$inferInsert;
export type SelectMatchup = typeof matchups.$inferSelect;

export type InsertGame = typeof games.$inferInsert;
export type SelectGame = typeof games.$inferSelect;

export type InsertCheckin = typeof checkins.$inferInsert;
export type SelectCheckin = typeof checkins.$inferSelect;

export type InsertSession = typeof sessions.$inferInsert;
export type SelectSession = typeof sessions.$inferSelect;

export type InsertAccount = typeof accounts.$inferInsert;
export type SelectAccount = typeof accounts.$inferSelect;

export type InsertVerification = typeof verifications.$inferInsert;
export type SelectVerification = typeof verifications.$inferSelect;

export type InsertJwks = typeof jwkss.$inferInsert;
export type SelectJwks = typeof jwkss.$inferSelect;

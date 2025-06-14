import { relations } from 'drizzle-orm';

import {
  checkinsTable,
  gamesTable,
  matchupsTable,
  messagesTable,
  teamsTable,
  teamsUsersTable,
  tournamentsTable,
  usersTable,
} from './schema';

export const gamesRelations = relations(gamesTable, ({ one }) => ({
  matchup: one(matchupsTable, {
    fields: [gamesTable.matchupId],
    references: [matchupsTable.id],
    relationName: 'matchupsGames',
  }),
}));

export const matchupsRelations = relations(matchupsTable, ({ one }) => ({
  games: one(gamesTable, {
    fields: [matchupsTable.id],
    references: [gamesTable.matchupId],
    relationName: 'matchupsGames',
  }),
  team1: one(teamsTable, {
    fields: [matchupsTable.team1Id],
    references: [teamsTable.id],
    relationName: 'teamsMatchups1',
  }),
  team2: one(teamsTable, {
    fields: [matchupsTable.team2Id],
    references: [teamsTable.id],
    relationName: 'teamsMatchups2',
  }),
}));

export const teamsRelations = relations(teamsTable, ({ many }) => ({
  matchups1: many(matchupsTable, {
    relationName: 'teamsMatchups1',
  }),
  matchups2: many(matchupsTable, {
    relationName: 'teamsMatchups2',
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

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  sender: one(usersTable, {
    fields: [messagesTable.senderId],
    references: [usersTable.id],
  }),
}));

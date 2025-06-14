import { relations } from 'drizzle-orm';

import {
  checkins,
  games,
  matchups,
  messages,
  teams,
  teams_users,
  tournaments,
  users,
} from './schema';

export const gamesRelations = relations(games, ({ one }) => ({
  matchup: one(matchups, {
    fields: [games.matchupId],
    references: [matchups.id],
    relationName: 'matchupsGames',
  }),
}));

export const matchupsRelations = relations(matchups, ({ one }) => ({
  games: one(games, {
    fields: [matchups.id],
    references: [games.matchupId],
    relationName: 'matchupsGames',
  }),
  team1: one(teams, {
    fields: [matchups.team1Id],
    references: [teams.id],
    relationName: 'teamsMatchups1',
  }),
  team2: one(teams, {
    fields: [matchups.team2Id],
    references: [teams.id],
    relationName: 'teamsMatchups2',
  }),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  matchups1: many(matchups, {
    relationName: 'teamsMatchups1',
  }),
  matchups2: many(matchups, {
    relationName: 'teamsMatchups2',
  }),
  users: many(teams_users),
}));

export const teams_usersRelations = relations(teams_users, ({ one }) => ({
  team: one(teams, {
    fields: [teams_users.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teams_users.userId],
    references: [users.id],
  }),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
  user: one(users, {
    fields: [checkins.userId],
    references: [users.id],
  }),
  tournament: one(tournaments, {
    fields: [checkins.tournamentId],
    references: [tournaments.id],
  }),
}));

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  checkins: many(checkins),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

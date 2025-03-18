// bun run src/app/scripts/clear-db.ts

import { db } from "~/db";
import {
  checkinsTable,
  usersTable,
  gamesTable,
  matchupsTable,
  teamsTable,
  teamsUsersTable,
  userChemistriesTable,
  tournamentsTable,
} from "~/db/schema";

async function main() {
  try {
    await db.delete(checkinsTable);
  } catch (error) {
    console.error(`Error deleting checkins: ${error}`);
  }
  try {
    await db.delete(teamsUsersTable);
  } catch (error) {
    console.error(`Error deleting teamsUsers: ${error}`);
  }
  try {
    await db.delete(gamesTable);
  } catch (error) {
    console.error(`Error deleting games: ${error}`);
  }
  try {
    await db.delete(matchupsTable);
  } catch (error) {
    console.error(`Error deleting matchups: ${error}`);
  }
  try {
    await db.delete(teamsTable);
  } catch (error) {
    console.error(`Error deleting teams: ${error}`);
  }
  try {
    await db.delete(usersTable);
  } catch (error) {
    console.error(`Error deleting users: ${error}`);
  }
  try {
    await db.delete(userChemistriesTable);
  } catch (error) {
    console.error(`Error deleting userChemistries: ${error}`);
  }
  try {
    await db.delete(tournamentsTable);
  } catch (error) {
    console.error(`Error deleting tournaments: ${error}`);
  }
}

main().catch(console.error);

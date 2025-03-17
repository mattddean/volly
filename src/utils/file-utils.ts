import fs from "node:fs";
import Papa from "papaparse";
import { Player } from "../models/player";

// Interface for game record
export interface GameRecord {
  date: string;
  team1: string[];
  team2: string[];
  score1: number;
  score2: number;
}

// Load players from CSV file
export function loadPlayersFromCSV(filePath: string): {
  [key: string]: Player;
} {
  const players: { [key: string]: Player } = {};

  if (!fs.existsSync(filePath)) {
    return players;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const results = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  results.data.forEach((row: any) => {
    if (row["Name"]) {
      const player = Player.fromObject(row);
      players[player.name] = player;
    }
  });

  return players;
}

// Save players to CSV file
export function savePlayersToCSV(
  players: { [key: string]: Player },
  filePath: string,
): void {
  const playerArray = Object.values(players).map((player) => player.toObject());

  // Convert chemistry objects to JSON strings for storage
  const csvReady = playerArray.map((p) => ({
    ...p,
    chemistry: JSON.stringify(p.chemistry),
  }));

  const csv = Papa.unparse(csvReady);
  fs.writeFileSync(filePath, csv);
}

// Load game history from CSV
export function loadGamesFromCSV(filePath: string): GameRecord[] {
  const games: GameRecord[] = [];

  if (!fs.existsSync(filePath)) {
    return games;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const results = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  results.data.forEach((row: any) => {
    if (row.date) {
      const game: GameRecord = {
        date: row.date,
        team1: JSON.parse(row.team1 || "[]"),
        team2: JSON.parse(row.team2 || "[]"),
        score1: Number.parseInt(row.score1),
        score2: Number.parseInt(row.score2),
      };
      games.push(game);
    }
  });

  return games;
}

// Save game history to CSV
export function saveGamesToCSV(games: GameRecord[], filePath: string): void {
  const csvReady = games.map((game) => ({
    date: game.date,
    team1: JSON.stringify(game.team1),
    team2: JSON.stringify(game.team2),
    score1: game.score1,
    score2: game.score2,
  }));

  const csv = Papa.unparse(csvReady);
  fs.writeFileSync(filePath, csv);
}

// Load attendance list from CSV
export function loadAttendanceFromCSV(filePath: string): string[] {
  const attendees: string[] = [];
  console.log(filePath);

  if (!fs.existsSync(filePath)) {
    return attendees;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const results = Papa.parse(fileContent, {
    header: false,
    skipEmptyLines: true,
  });
  console.log(results);

  results.data.forEach((row: any) => {
    if (row[0]) {
      attendees.push(row[0].trim());
    }
  });

  return attendees;
}

// Save attendance list to CSV
export function saveAttendanceToCSV(
  attendees: string[],
  filePath: string,
): void {
  const csvRows = attendees.map((name) => [name]);
  const csv = Papa.unparse(csvRows);
  fs.writeFileSync(filePath, csv);
}

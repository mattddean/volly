import inquirer from "inquirer";
import { VolleyballMatchmaker } from "./volleyball-matchmaker";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { Player } from "./models/player";

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "./");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Set up file paths
const playerFile = path.join(dataDir, "players.csv");
const gameFile = path.join(dataDir, "games.csv");
const attendanceFile = path.join(dataDir, "attendance.csv");

// Create matchmaker instance
const matchmaker = new VolleyballMatchmaker(
  playerFile,
  gameFile,
  attendanceFile
);

// Main menu function
async function mainMenu() {
  console.log(chalk.cyan("\n===== Volleyball Matchmaker ====="));

  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Choose an option:",
      choices: [
        "1. Load attending players",
        "2. Create two balanced teams",
        "3. Create multiple teams",
        "4. Record game result",
        "5. Manual player adjustment",
        "6. View player stats",
        "7. Reset player stats",
        "8. Quit",
      ],
    },
  ]);

  const option = parseInt(choice.split(".")[0]);

  switch (option) {
    case 1:
      await loadAttendingPlayers();
      break;
    case 2:
      await createTwoTeams();
      break;
    case 3:
      await createMultipleTeams();
      break;
    case 4:
      await recordGameResult();
      break;
    case 5:
      await manualPlayerAdjustment();
      break;
    case 6:
      await viewPlayerStats();
      break;
    case 7:
      await resetPlayerStats();
      break;
    case 8:
      console.log(chalk.green("\nThank you for using Volleyball Matchmaker!"));
      process.exit(0);
      break;
    default:
      console.log(chalk.red("Invalid option, please try again."));
      await mainMenu();
  }

  // Return to main menu
  await mainMenu();
}

// Load attending players
async function loadAttendingPlayers() {
  try {
    matchmaker.loadAttendingPlayers();

    if (matchmaker.attendingPlayers.length === 0) {
      console.log(chalk.yellow("\nNo attending players found."));

      const { createFile } = await inquirer.prompt([
        {
          type: "confirm",
          name: "createFile",
          message: "Would you like to add players now?",
          default: true,
        },
      ]);

      if (createFile) {
        await addAttendingPlayers();
      }
    } else {
      console.log(
        chalk.green(
          `\nLoaded ${matchmaker.attendingPlayers.length} attending players.`
        )
      );
      console.log("\nAttending players:");
      matchmaker.attendingPlayers.forEach((player) => {
        console.log(`- ${player.toString()}`);
      });
    }
  } catch (error) {
    console.error(chalk.red("Error loading attending players:"), error);
  }
}

// Add attending players
async function addAttendingPlayers() {
  const { playerNames } = await inquirer.prompt([
    {
      type: "input",
      name: "playerNames",
      message: "Enter player names (comma-separated):",
      validate: (input: string) =>
        input.trim() !== "" || "Please enter at least one player name",
    },
  ]);

  const names = playerNames.split(",").map((name: string) => name.trim());
  const uniqueNames = [...new Set(names)]; // Remove duplicates

  fs.writeFileSync(attendanceFile, uniqueNames.join("\n"));
  console.log(
    chalk.green(`Added ${uniqueNames.length} players to attendance list.`)
  );

  // Reload attending players
  matchmaker.loadAttendingPlayers();
}

// Create two balanced teams
async function createTwoTeams() {
  if (matchmaker.attendingPlayers.length < 4) {
    console.log(
      chalk.yellow(
        "\nNot enough attending players. Please load at least 4 players."
      )
    );
    return;
  }

  const { teamSize, iterations } = await inquirer.prompt([
    {
      type: "number",
      name: "teamSize",
      message: "Enter team size (players per team):",
      default: 6,
      validate: (input: number) => input >= 1 || "Team size must be at least 1",
    },
    {
      type: "number",
      name: "iterations",
      message: "Enter number of iterations for optimization:",
      default: 500,
      validate: (input: number) =>
        input >= 1 || "Iterations must be at least 1",
    },
  ]);

  const [team1, team2] = matchmaker.createTeams(teamSize, iterations);

  console.log(chalk.green("\nTeams created:"));

  console.log(chalk.cyan("\nTeam 1:"));
  team1.forEach((player) => {
    console.log(`- ${player.toString()}`);
  });
  console.log(
    `Average Rating: ${matchmaker.calculateTeamRating(team1).toFixed(1)}`
  );
  console.log(`Chemistry: ${matchmaker.teamChemistryScore(team1).toFixed(1)}`);

  console.log(chalk.cyan("\nTeam 2:"));
  team2.forEach((player) => {
    console.log(`- ${player.toString()}`);
  });
  console.log(
    `Average Rating: ${matchmaker.calculateTeamRating(team2).toFixed(1)}`
  );
  console.log(`Chemistry: ${matchmaker.teamChemistryScore(team2).toFixed(1)}`);

  const quality = matchmaker.predictMatchQuality(team1, team2);
  console.log(
    chalk.magenta(`\nPredicted Match Quality: ${quality.toFixed(1)}/100`)
  );
}

// Create multiple teams
async function createMultipleTeams() {
  if (matchmaker.attendingPlayers.length < 6) {
    console.log(
      chalk.yellow(
        "\nNot enough attending players. Please load at least 6 players."
      )
    );
    return;
  }

  const { teamSize, numTeams, iterations, scheduleRounds } =
    await inquirer.prompt([
      {
        type: "number",
        name: "teamSize",
        message: "Enter team size (default 6):",
        default: 6,
      },
      {
        type: "input",
        name: "numTeams",
        message: "Enter number of teams (or press Enter for maximum possible):",
        default: "",
      },
      {
        type: "number",
        name: "iterations",
        message: "Enter number of iterations for optimization:",
        default: 200,
      },
      {
        type: "input",
        name: "scheduleRounds",
        message:
          "Enter number of rounds to schedule (or press Enter for one round):",
        default: "",
      },
    ]);

  const numTeamsValue = numTeams.trim() === "" ? null : parseInt(numTeams);
  const scheduleRoundsValue =
    scheduleRounds.trim() === "" ? null : parseInt(scheduleRounds);

  matchmaker.createMultipleTeams(
    teamSize,
    numTeamsValue,
    iterations,
    scheduleRoundsValue
  );
}

// Record game result
async function recordGameResult() {
  if (matchmaker.attendingPlayers.length < 4) {
    console.log(
      chalk.yellow(
        "\nNot enough attending players. Please load at least 4 players."
      )
    );
    return;
  }

  // Get all player names
  const playerNames = matchmaker.attendingPlayers.map((p) => p.name);

  console.log(chalk.cyan("\n=== Record Game Result ==="));

  // Get team 1 players
  const { team1Names } = await inquirer.prompt<{ team1Names: string[] }>([
    {
      type: "checkbox",
      name: "team1Names",
      message: "Select Team 1 players:",
      choices: playerNames,
      validate: (input: string[]) =>
        input.length > 0 || "Please select at least one player",
    },
  ]);

  // Get remaining players for team 2
  const remainingPlayers = playerNames.filter(
    (name) => !team1Names.includes(name)
  );

  const { team2Names } = await inquirer.prompt<{ team2Names: string[] }>([
    {
      type: "checkbox",
      name: "team2Names",
      message: "Select Team 2 players:",
      choices: remainingPlayers,
      validate: (input: string[]) =>
        input.length > 0 || "Please select at least one player",
    },
  ]);

  // Get scores
  const { score1, score2 } = await inquirer.prompt([
    {
      type: "number",
      name: "score1",
      message: "Team 1 score:",
      validate: (input: number) =>
        input >= 0 || "Score must be a non-negative number",
    },
    {
      type: "number",
      name: "score2",
      message: "Team 2 score:",
      validate: (input: number) =>
        input >= 0 || "Score must be a non-negative number",
    },
  ]);

  // Convert names to player objects
  const team1 = team1Names.map((name) => matchmaker.players[name]);
  const team2 = team2Names.map((name) => matchmaker.players[name]);

  // Record the result
  matchmaker.recordGameResult(team1, team2, score1, score2);
}

// Manual player adjustment
async function manualPlayerAdjustment() {
  console.log(chalk.cyan("\n=== Manual Player Adjustment ==="));

  // Get player
  const { playerName } = await inquirer.prompt([
    {
      type: "input",
      name: "playerName",
      message: "Enter player name to adjust:",
      validate: (input: string) => {
        if (input.trim() === "") return "Please enter a name";
        return true;
      },
    },
  ]);

  // Check if player exists
  if (!(playerName in matchmaker.players)) {
    console.log(chalk.yellow(`Player '${playerName}' not found.`));

    const { createPlayer } = await inquirer.prompt([
      {
        type: "confirm",
        name: "createPlayer",
        message: "Would you like to create this player?",
        default: true,
      },
    ]);

    if (createPlayer) {
      const { skillGroup } = await inquirer.prompt([
        {
          type: "list",
          name: "skillGroup",
          message: "Select skill group (A is best):",
          choices: ["A", "B", "C", "D", "E", "F"],
          default: "C",
        },
      ]);

      matchmaker.players[playerName] = new Player(0, playerName, skillGroup);
      matchmaker.savePlayers();
      console.log(
        chalk.green(
          `Created new player: ${matchmaker.players[playerName].toString()}`
        )
      );
    }

    return;
  }

  const player = matchmaker.players[playerName];
  console.log(`Current player info: ${player.toString()}`);

  // Get adjustments
  const { adjustType } = await inquirer.prompt([
    {
      type: "list",
      name: "adjustType",
      message: "What would you like to adjust?",
      choices: ["Skill Group", "Rating", "Both", "Cancel"],
    },
  ]);

  if (adjustType === "Cancel") {
    return;
  }

  let newSkillGroup: string | null = null;
  let newRating: number | null = null;

  if (adjustType === "Skill Group" || adjustType === "Both") {
    const { skillGroup } = await inquirer.prompt([
      {
        type: "list",
        name: "skillGroup",
        message: "Select new skill group (A is best):",
        choices: ["A", "B", "C", "D", "E", "F"],
        default: player.skillGroup,
      },
    ]);

    newSkillGroup = skillGroup;
  }

  if (adjustType === "Rating" || adjustType === "Both") {
    const { rating } = await inquirer.prompt([
      {
        type: "number",
        name: "rating",
        message: "Enter new rating (0-200):",
        default: player.zScore,
        validate: (input: number) =>
          (input >= 0 && input <= 200) || "Rating must be between 0 and 200",
      },
    ]);

    newRating = rating;
  }

  matchmaker.adjustPlayer(playerName, newSkillGroup, newRating);
}

// View player stats
async function viewPlayerStats() {
  console.log(chalk.cyan("\n=== Player Statistics ==="));

  const playerCount = Object.keys(matchmaker.players).length;

  if (playerCount === 0) {
    console.log(chalk.yellow("No players found in the system."));
    return;
  }

  const { sortBy } = await inquirer.prompt([
    {
      type: "list",
      name: "sortBy",
      message: "Sort players by:",
      choices: ["Name", "Skill Group", "Rating", "Games Played"],
      default: "Rating",
    },
  ]);

  // Convert player object to array
  const playerArray = Object.values(matchmaker.players);

  // Sort based on selection
  switch (sortBy) {
    case "Name":
      playerArray.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "Skill Group":
      playerArray.sort((a, b) => a.skillGroup.localeCompare(b.skillGroup));
      break;
    case "Rating":
      playerArray.sort((a, b) => b.weightedRating() - a.weightedRating());
      break;
    case "Games Played":
      playerArray.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
      break;
  }

  // Display players
  console.log(`\nTotal players: ${playerCount}`);
  playerArray.forEach((player) => {
    let line = `${player.toString()}`;
    if (player.gamesPlayed > 0) {
      const winPct = ((player.wins / player.gamesPlayed) * 100).toFixed(0);
      line += `, Win: ${winPct}%`;
    }
    console.log(line);
  });
}

// Reset player stats
async function resetPlayerStats() {
  console.log(chalk.cyan("\n=== Reset Player Statistics ==="));

  const { resetType } = await inquirer.prompt([
    {
      type: "list",
      name: "resetType",
      message: "Choose reset option:",
      choices: [
        "Reset a specific player",
        "Reset ALL players (careful!)",
        "Cancel",
      ],
    },
  ]);

  if (resetType === "Cancel") {
    return;
  }

  if (resetType === "Reset ALL players (careful!)") {
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: chalk.red(
          "WARNING: This will reset ALL player statistics to default. Are you sure?"
        ),
        default: false,
      },
    ]);

    if (confirm) {
      matchmaker.resetPlayerStats(true);
    } else {
      console.log("Reset canceled.");
    }

    return;
  }

  // Reset specific player
  const playerNames = Object.keys(matchmaker.players).sort();

  const { playerName } = await inquirer.prompt([
    {
      type: "list",
      name: "playerName",
      message: "Select player to reset:",
      choices: [...playerNames, "Cancel"],
    },
  ]);

  if (playerName === "Cancel") {
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Are you sure you want to reset ${playerName}'s stats?`,
      default: false,
    },
  ]);

  if (confirm) {
    matchmaker.resetPlayerStats(false, playerName);
  } else {
    console.log("Reset canceled.");
  }
}

// Export functions for use in main
export { mainMenu };

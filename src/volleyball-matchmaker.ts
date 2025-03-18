import type { SelectGame, SelectUser } from "./db/schema";
import { Player } from "./models/player";
import type {
  // loadPlayersFromCSV,
  // savePlayersToCSV,
  // loadGamesFromCSV,
  // saveGamesToCSV,
  // loadAttendanceFromCSV,
  // saveAttendanceToCSV,
  GameRecord,
} from "./utils/file-utils";
import {
  // standardDeviation,
  average,
  calculateTeamRating,
  calculateTeamChemistry,
} from "./utils/math-utils";
import { format } from "date-fns";

export class VolleyballMatchmaker {
  players: { [id: string]: Player };
  attendingPlayers: Player[];
  pairPerformances: { [key: string]: number[] };
  historicalGames: GameRecord[];
  beta: number;
  dynamicFactor: number;
  uncertaintyFactor: number;

  constructor(
    allPlayers: SelectUser[],
    games: (SelectGame & { team1: SelectUser[]; team2: SelectUser[] })[],
    attendingPlayers: SelectUser[],
  ) {
    this.players = allPlayers.reduce(
      (acc, player) => {
        acc[player.id] = new Player({
          id: player.id,
          name: player.name,
          skillGroup: player.skillGroup,
          zScore: player.zScore,
          sigma: player.sigma,
          lastPlayed: new Date(player.lastPlayedDay),
        });
        return acc;
      },
      {} as { [id: string]: Player },
    );
    this.attendingPlayers = attendingPlayers.map(
      (player) => this.players[player.id],
    );

    // Chemistry tracking
    this.pairPerformances = {};

    // TrueSkill parameters
    this.beta = 20.0; // How much difference in skill translates to score difference
    this.dynamicFactor = 5.0; // Base adjustment factor
    this.uncertaintyFactor = 0.5; // How much uncertainty to maintain in the system

    // Historical game data
    this.historicalGames = games.map((game) => ({
      team1: game.team1.map((player) => player.name), // TODO: use player ids
      team2: game.team2.map((player) => player.name), // TODO: use player ids
      score1: game.team1Score,
      score2: game.team2Score,
      date: game.day,
    }));

    // Load existing player data and game history
    // this.loadPlayers();
    // this.loadGames();
  }

  // // Load player data from file
  // loadPlayers(): void {
  //   this.players = loadPlayersFromCSV(this.playerFile);
  //   console.log(
  //     `Loaded ${Object.keys(this.players).length} players from system.`
  //   );
  // }

  // // Save player data to file
  // savePlayers(): void {
  //   savePlayersToCSV(this.players, this.playerFile);
  // }

  // // Load game history
  // loadGames(): void {
  //   this.historicalGames = loadGamesFromCSV(this.gameFile);
  //   console.log(`Loaded ${this.historicalGames.length} historical games.`);
  // }

  // // Save game history
  // saveGames(): void {
  //   saveGamesToCSV(this.historicalGames, this.gameFile);
  // }

  // // Load attending players from file
  // loadAttendingPlayers(): void {
  //   const attendees = loadAttendanceFromCSV(this.attendanceFile);
  //   this.attendingPlayers = [];

  //   let newPlayers = 0;
  //   for (const name of attendees) {
  //     if (name in this.players) {
  //       this.attendingPlayers.push(this.players[name]);
  //     } else {
  //       // Create new player with default skill group C
  //       const newPlayer = new Player(name, "C");
  //       this.players[name] = newPlayer;
  //       this.attendingPlayers.push(newPlayer);
  //       newPlayers++;
  //     }
  //   }

  //   console.log(
  //     `Loaded ${this.attendingPlayers.length} attending players (${newPlayers} new).`
  //   );
  // }

  // Get team chemistry score
  teamChemistryScore(team: Player[]): number {
    return calculateTeamChemistry(team);
  }

  // Predict match quality/closeness
  predictMatchQuality(team1: Player[], team2: Player[]): number {
    // Base prediction on weighted skill difference
    const team1Skill = calculateTeamRating(team1);
    const team2Skill = calculateTeamRating(team2);

    // Add chemistry bonus
    const team1Chemistry = this.teamChemistryScore(team1);
    const team2Chemistry = this.teamChemistryScore(team2);

    // Adjust skills based on chemistry
    const team1Effective = team1Skill + team1Chemistry * 0.2;
    const team2Effective = team2Skill + team2Chemistry * 0.2;

    // Calculate predicted score difference
    const skillDiff = Math.abs(team1Effective - team2Effective);
    const predScoreDiff = skillDiff / 2.5; // ~25 rating points = 1 point difference

    // Quality is higher for closer predicted games (25-23 is better than 25-15)
    const quality = 100 * (1 / (1 + predScoreDiff / 3));

    // Account for team uncertainties - less confident predictions get a penalty
    const team1Uncertainty = average(team1.map((p) => p.sigma));
    const team2Uncertainty = average(team2.map((p) => p.sigma));
    const avgUncertainty = (team1Uncertainty + team2Uncertainty) / 2;

    // Reduce quality if uncertainty is high
    const confidenceFactor = 100 / (100 + avgUncertainty);

    return quality * confidenceFactor;
  }

  // Create two balanced teams
  createTeams(teamSize = 6, iterations = 500): [Player[], Player[]] {
    if (this.attendingPlayers.length < teamSize * 2) {
      console.log(
        `Warning: Not enough players for two teams of size ${teamSize}`,
      );
      teamSize = Math.min(
        teamSize,
        Math.floor(this.attendingPlayers.length / 2),
      );
    }

    // Get available players
    const availablePlayers = [...this.attendingPlayers];

    // Determine how many players per team
    const playersPerTeam = Math.min(
      teamSize,
      Math.floor(availablePlayers.length / 2),
    );

    // Try multiple random combinations and keep the best one
    let bestTeams: [Player[], Player[]] | null = null;
    let bestQuality = -1;

    for (let i = 0; i < iterations; i++) {
      // Shuffle the players
      this.shuffleArray(availablePlayers);

      // Divide into two teams
      const team1 = availablePlayers.slice(0, playersPerTeam);
      const team2 = availablePlayers.slice(playersPerTeam, playersPerTeam * 2);

      // Calculate match quality
      const quality = this.predictMatchQuality(team1, team2);

      if (quality > bestQuality) {
        bestQuality = quality;
        bestTeams = [team1, team2];
      }
    }

    // Sort the players by rating for display purposes
    if (bestTeams) {
      bestTeams[0].sort((a, b) => b.weightedRating() - a.weightedRating());
      bestTeams[1].sort((a, b) => b.weightedRating() - a.weightedRating());

      console.log(
        `Created two teams with quality: ${bestQuality.toFixed(1)}/100`,
      );
      return bestTeams;
    }

    // Fallback - should never happen
    return [
      availablePlayers.slice(0, playersPerTeam),
      availablePlayers.slice(playersPerTeam, playersPerTeam * 2),
    ];
  }

  // Create multiple balanced teams
  createMultipleTeams(
    teamSize = 6,
    numTeams: number | null = null,
    iterations = 200,
    scheduleRounds: number,
  ) {
    const availablePlayers = [...this.attendingPlayers];
    const totalPlayers = availablePlayers.length;

    // Determine how many teams to create
    if (numTeams !== null) {
      // User specified number of teams
      if (numTeams < 2) {
        console.log("Need at least 2 teams");
        return [];
      }
    } else {
      // Calculate optimal number of teams to include everyone
      // Prefer teams of size [teamSize] or [teamSize-1]
      numTeams = Math.ceil(totalPlayers / teamSize); // Ceiling division
    }

    // Make sure we have enough players for the requested number of teams
    const minPlayersNeeded = numTeams * (teamSize - 1); // Allow teams to be 1 player smaller
    if (totalPlayers < minPlayersNeeded) {
      console.log(
        `Warning: Not enough players for ${numTeams} teams with at least ${
          teamSize - 1
        } players each`,
      );
      // Reduce number of teams if necessary
      numTeams = Math.max(2, Math.floor(totalPlayers / (teamSize - 1)));
      console.log(`Creating ${numTeams} teams instead`);
    }

    console.log(
      `Creating ${numTeams} teams with approximately ${Math.floor(
        totalPlayers / numTeams,
      )} players each`,
    );

    // Calculate player distribution
    const baseSize = Math.floor(totalPlayers / numTeams); // Minimum players per team
    const extraPlayers = totalPlayers % numTeams; // Teams that get an extra player

    if (baseSize < teamSize - 1) {
      console.log(`Note: Teams will have ${baseSize} players each`);
    } else if (extraPlayers > 0) {
      console.log(
        `Note: ${extraPlayers} teams will have ${
          baseSize + 1
        } players, the rest will have ${baseSize}`,
      );
    }

    // Optimization approach to create balanced teams
    let bestTeams: Player[][] | null = null;
    let bestBalanceScore = Number.POSITIVE_INFINITY; // Lower is better (less variance)

    for (let iter = 0; iter < iterations; iter++) {
      // Shuffle the players for this iteration
      this.shuffleArray(availablePlayers);

      // Pre-sort A-tier players to distribute them
      const aTierPlayers = availablePlayers.filter((p) => p.skillGroup === "A");
      const nonAPlayers = availablePlayers.filter((p) => p.skillGroup !== "A");

      // Check if we can distribute A players evenly
      if (aTierPlayers.length > numTeams) {
        console.log(
          `Warning: More A-tier players (${aTierPlayers.length}) than teams (${numTeams})!`,
        );
      }

      // Create teams with calculated distribution but ensure A-tier players are distributed
      const teams: Player[][] = Array(numTeams)
        .fill(null)
        .map(() => []);

      // First, distribute A-tier players (at most one per team)
      for (let i = 0; i < aTierPlayers.length; i++) {
        if (i < numTeams) {
          // Assign one A player per team until we run out of teams
          teams[i].push(aTierPlayers[i]);
        } else {
          // If we have more A players than teams, add to non-A list to be distributed later
          nonAPlayers.push(aTierPlayers[i]);
        }
      }

      // Shuffle the remaining players
      this.shuffleArray(nonAPlayers);

      // Distribute remaining players to balance team sizes
      let playerIndex = 0;
      for (let i = 0; i < numTeams; i++) {
        // Calculate remaining spots needed
        const currentTeamSize = teams[i].length;
        const targetSize = baseSize + (i < extraPlayers ? 1 : 0);
        const spotsNeeded = targetSize - currentTeamSize;

        // Add remaining players
        if (
          spotsNeeded > 0 &&
          playerIndex + spotsNeeded <= nonAPlayers.length
        ) {
          teams[i].push(
            ...nonAPlayers.slice(playerIndex, playerIndex + spotsNeeded),
          );
          playerIndex += spotsNeeded;
        }
      }

      // Skip if we couldn't create enough balanced teams
      if (teams.some((team) => team.length < baseSize - 1)) {
        continue;
      }

      // Calculate normalized team ratings to account for different team sizes
      const teamRatings: number[] = [];
      const allPlayerRatings = availablePlayers.map((p) => p.weightedRating());
      const globalAvgRating = average(allPlayerRatings);

      for (const team of teams) {
        if (team.length === teamSize) {
          // For full-sized teams, use actual average
          teamRatings.push(calculateTeamRating(team));
        } else {
          // For smaller teams, add "virtual players" at the global average rating
          const totalRating = team.reduce(
            (sum, p) => sum + p.weightedRating(),
            0,
          );
          const missingPlayers = teamSize - team.length;
          const normalizedRating =
            (totalRating + missingPlayers * globalAvgRating) / teamSize;
          teamRatings.push(normalizedRating);
        }
      }

      // Calculate the range and variance of normalized ratings
      const ratingVariance = this.variance(teamRatings);
      const ratingRange = Math.max(...teamRatings) - Math.min(...teamRatings);

      // Also calculate average quality across all possible matchups
      let qualitySum = 0;
      let matchupCount = 0;

      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const quality = this.predictMatchQuality(teams[i], teams[j]);
          qualitySum += quality;
          matchupCount++;
        }
      }

      const avgQuality = qualitySum / Math.max(1, matchupCount);

      // Calculate team chemistry factor
      const avgChemistry = average(
        teams.map((team) => this.teamChemistryScore(team)),
      );

      // Combined balance score (heavily weighted towards rating balance)
      // Lower score is better
      const balanceScore =
        ratingVariance * 10.0 +
        ratingRange * 3.0 -
        avgQuality / 100 -
        avgChemistry / 10;

      if (balanceScore < bestBalanceScore) {
        bestBalanceScore = balanceScore;
        bestTeams = teams.map((team) => [...team]); // deep copy
      }
    }

    // If we couldn't create balanced teams, try with fewer iterations
    if (!bestTeams) {
      console.log("Failed to create balanced teams, returning simple division");

      // Simple division
      this.shuffleArray(availablePlayers);

      const teams: Player[][] = [];
      let playerIndex = 0;

      for (
        let i = 0;
        i < numTeams && playerIndex < availablePlayers.length;
        i++
      ) {
        const currentTeamSize = baseSize + (i < extraPlayers ? 1 : 0);
        const team = availablePlayers.slice(
          playerIndex,
          playerIndex + currentTeamSize,
        );
        teams.push(team);
        playerIndex += currentTeamSize;
      }

      const tms = [];
      for (const team of teams) {
        tms.push({
          players: team,
          avgZScore: 0,
          normalizedAvgZScore: 0,
          chemistry: 0,
        });
      }

      return tms;
    }

    // For displaying team info, we'll show both actual and normalized ratings
    console.log("\nTeams created:");
    const teamRatings: number[] = [];
    const normalizedRatings: number[] = [];
    const allPlayerRatings = availablePlayers.map((p) => p.weightedRating());
    const globalAvgRating = average(allPlayerRatings);

    const tms = [];
    for (let i = 0; i < bestTeams.length; i++) {
      const team = bestTeams[i];

      // Actual average rating
      const teamSkill = calculateTeamRating(team);
      teamRatings.push(teamSkill);

      // Normalized rating (for comparing teams of different sizes)
      let normRating: number;
      if (team.length === teamSize) {
        normRating = teamSkill;
      } else {
        const totalRating = team.reduce(
          (sum, p) => sum + p.weightedRating(),
          0,
        );
        const missingPlayers = teamSize - team.length;
        normRating =
          (totalRating + missingPlayers * globalAvgRating) / teamSize;
      }

      normalizedRatings.push(normRating);

      const teamChem = this.teamChemistryScore(team);
      console.log(
        `Team ${i + 1} (${
          team.length
        } players) - Avg Rating: ${teamSkill.toFixed(1)}, ` +
          `Normalized: ${normRating.toFixed(1)}, Chemistry: ${teamChem.toFixed(
            1,
          )}`,
      );

      tms.push({
        players: team,
        avgZScore: teamSkill,
        normalizedAvgZScore: normRating,
        chemistry: teamChem,
      });
    }

    // Show overall team balance stats
    const ratingVariance = this.variance(normalizedRatings);
    const ratingRange =
      Math.max(...normalizedRatings) - Math.min(...normalizedRatings);
    console.log("\nTeam Balance Statistics:");
    console.log(
      `  Normalized Rating Range: ${Math.min(...normalizedRatings).toFixed(
        1,
      )} - ${Math.max(...normalizedRatings).toFixed(
        1,
      )} (spread: ${ratingRange.toFixed(1)})`,
    );
    console.log(`  Normalized Rating Variance: ${ratingVariance.toFixed(2)}`);
    console.log(`  Perfect Balance: ${ratingRange < 5.0 ? "Yes" : "No"}`);

    // Create a match schedule if requested
    // Create the schedule first

    // else {
    //   // Create matchups showing normalized ratings
    //   console.log("\nRecommended Matchups:");
    //   const optimalMatchups = this.createOptimalMatchups(bestTeams);

    //   for (let i = 0; i < optimalMatchups.length; i++) {
    //     const [team1Idx, team2Idx] = optimalMatchups[i];
    //     const team1 = bestTeams[team1Idx];
    //     const team2 = bestTeams[team2Idx];
    //     const quality = this.predictMatchQuality(team1, team2);
    //     const team1Rating = teamRatings[team1Idx];
    //     const team2Rating = teamRatings[team2Idx];
    //     const team1Norm = normalizedRatings[team1Idx];
    //     const team2Norm = normalizedRatings[team2Idx];
    //     const ratingDiff = Math.abs(team1Norm - team2Norm);

    //     console.log(
    //       `Match ${i + 1}: Team ${team1Idx + 1} (${
    //         team1.length
    //       } players, ${team1Rating.toFixed(1)}/${team1Norm.toFixed(
    //         1
    //       )} norm) vs ` +
    //         `Team ${team2Idx + 1} (${
    //           team2.length
    //         } players, ${team2Rating.toFixed(1)}/${team2Norm.toFixed(
    //           1
    //         )} norm) - ` +
    //         `Norm Diff: ${ratingDiff.toFixed(1)}, Quality: ${quality.toFixed(
    //           1
    //         )}/100`
    //     );
    //   }

    //   // Also show all possible matchups for reference
    //   console.log("\nAll Possible Matchups (Sorted by Quality):");
    //   const allMatchups: [number, number, number][] = [];

    //   for (let i = 0; i < bestTeams.length; i++) {
    //     for (let j = i + 1; j < bestTeams.length; j++) {
    //       const quality = this.predictMatchQuality(bestTeams[i], bestTeams[j]);
    //       const ratingDiff = Math.abs(
    //         normalizedRatings[i] - normalizedRatings[j]
    //       );
    //       allMatchups.push([i, j, quality]);
    //     }
    //   }

    //   // Sort by quality (highest first)
    //   allMatchups.sort((a, b) => b[2] - a[2]);

    //   for (const [team1Idx, team2Idx, quality] of allMatchups) {
    //     const ratingDiff = Math.abs(
    //       normalizedRatings[team1Idx] - normalizedRatings[team2Idx]
    //     );
    //     console.log(
    //       `Team ${team1Idx + 1} vs Team ${
    //         team2Idx + 1
    //       }: Diff ${ratingDiff.toFixed(1)}, Quality ${quality.toFixed(1)}/100`
    //     );
    //   }

    //   // Show team compositions
    //   for (let i = 0; i < bestTeams.length; i++) {
    //     const team = bestTeams[i];
    //     console.log(`\nTeam ${i + 1}:`);

    //     for (const player of team) {
    //       console.log(`  ${player.toString()}`);
    //     }

    //     const teamRating = calculateTeamRating(team);
    //     const teamChem = this.teamChemistryScore(team);
    //     console.log(
    //       `  Team Average: Rating ${teamRating.toFixed(
    //         1
    //       )}, Chemistry ${teamChem.toFixed(1)}`
    //     );
    //   }
    // }

    return tms;
  }

  // // Shuffle array in place (Fisher-Yates algorithm)
  // private shuffleArray<T>(array: T[]): void {
  //   for (let i = array.length - 1; i > 0; i--) {
  //     const j = Math.floor(Math.random() * (i + 1));
  //     [array[i], array[j]] = [array[j], array[i]];
  //   }
  // }

  // // Calculate variance of an array of numbers
  // private variance(values: number[]): number {
  //   const avg = average(values);
  //   return average(values.map((v) => Math.pow(v - avg, 2)));
  // }

  // Create optimal matchups for a set of teams
  createOptimalMatchups(teams: Player[][]): [number, number][] {
    // If odd number of teams, one will sit out
    const numTeams = teams.length;
    const numMatches = Math.floor(numTeams / 2);

    // Create a matrix of match qualities
    const qualityMatrix: number[][] = [];
    for (let i = 0; i < numTeams; i++) {
      qualityMatrix[i] = [];
      for (let j = 0; j < numTeams; j++) {
        if (i === j) {
          qualityMatrix[i][j] = -1; // Team can't play itself
        } else {
          qualityMatrix[i][j] = this.predictMatchQuality(teams[i], teams[j]);
        }
      }
    }

    // Find optimal matchups greedily
    const matchups: [number, number][] = [];
    const usedTeams = new Set<number>();

    for (let match = 0; match < numMatches; match++) {
      let bestQuality = -1;
      let bestPair: [number, number] = [-1, -1];

      for (let i = 0; i < numTeams; i++) {
        if (usedTeams.has(i)) continue;

        for (let j = i + 1; j < numTeams; j++) {
          if (usedTeams.has(j)) continue;

          const quality = qualityMatrix[i][j];
          if (quality > bestQuality) {
            bestQuality = quality;
            bestPair = [i, j];
          }
        }
      }

      if (bestPair[0] !== -1) {
        matchups.push(bestPair);
        usedTeams.add(bestPair[0]);
        usedTeams.add(bestPair[1]);
      }
    }

    return matchups;
  }

  // Create a match schedule
  createMatchSchedule(
    teams: Player[][],
    numRounds: number,
  ): [number, number][][] {
    const numTeams = teams.length;

    // Calculate maximum possible rounds where each team plays once per round
    const maxRounds = numTeams % 2 === 0 ? numTeams - 1 : numTeams;

    // Cap requested rounds to maximum possible without repeats
    numRounds = Math.min(numRounds, maxRounds);

    // For odd number of teams, one team sits out each round
    const hasBye = numTeams % 2 === 1;

    // Track which teams have played each other
    const playedAgainst = new Set<string>(); // "team1_idx-team2_idx" pairs

    // Create schedule
    const schedule: [number, number][][] = [];

    // Use circle method for round-robin tournament scheduling
    let virtualTeams: number[];
    if (hasBye) {
      // With odd number of teams, we'll use a dummy team that represents a "bye"
      virtualTeams = Array.from({ length: numTeams + 1 }, (_, i) => i); // 0 to numTeams (inclusive)
    } else {
      virtualTeams = Array.from({ length: numTeams }, (_, i) => i); // 0 to numTeams-1
    }

    // For each round
    for (let round = 0; round < numRounds; round++) {
      const roundMatches: [number, number][] = [];

      // Rotate teams except the first one
      if (round > 0) {
        const firstTeam = virtualTeams[0];
        const lastTeam = virtualTeams[virtualTeams.length - 1];
        for (let i = virtualTeams.length - 1; i > 1; i--) {
          virtualTeams[i] = virtualTeams[i - 1];
        }
        virtualTeams[1] = lastTeam;
      }

      // Create matches for this round
      for (let i = 0; i < virtualTeams.length / 2; i++) {
        const team1Idx = virtualTeams[i];
        const team2Idx = virtualTeams[virtualTeams.length - 1 - i];

        // Skip if this involves the dummy team (for odd number of teams)
        if (hasBye && (team1Idx === numTeams || team2Idx === numTeams)) {
          // One team gets a bye this round
          continue;
        }

        // Ensure team1_idx < team2_idx for consistency
        if (team1Idx > team2Idx) {
          roundMatches.push([team2Idx, team1Idx]);
        } else {
          roundMatches.push([team1Idx, team2Idx]);
        }
      }

      schedule.push(roundMatches);
    }

    // Sort each round by match quality
    for (let roundIdx = 0; roundIdx < schedule.length; roundIdx++) {
      // Calculate match quality for each matchup
      const matchupsWithQuality: [number, number, number][] = [];
      for (const [team1Idx, team2Idx] of schedule[roundIdx]) {
        const quality = this.predictMatchQuality(
          teams[team1Idx],
          teams[team2Idx],
        );
        matchupsWithQuality.push([team1Idx, team2Idx, quality]);
      }

      // Sort by quality (highest first)
      matchupsWithQuality.sort((a, b) => b[2] - a[2]);

      // Update schedule with sorted matchups
      schedule[roundIdx] = matchupsWithQuality.map(
        (m) => [m[0], m[1]] as [number, number],
      );
    }

    return schedule;
  }

  // Display match schedule
  collectMatchSchedule(
    teams: Player[][],
    schedule: [number, number][][],
    normalizedRatings: number[] | null = null,
  ): void {
    console.log("\n===== FULL MATCH SCHEDULE =====");

    const matchups = [];

    for (let roundIdx = 0; roundIdx < schedule.length; roundIdx++) {
      console.log(`\nROUND ${roundIdx + 1}:`);

      for (let matchIdx = 0; matchIdx < schedule[roundIdx].length; matchIdx++) {
        const [team1Idx, team2Idx] = schedule[roundIdx][matchIdx];
        const team1 = teams[team1Idx];
        const team2 = teams[team2Idx];
        const quality = this.predictMatchQuality(team1, team2);

        const team1Skill = calculateTeamRating(team1);
        const team2Skill = calculateTeamRating(team2);

        const team1Norm = normalizedRatings?.[team1Idx];
        const team2Norm = normalizedRatings?.[team2Idx];
        const ratingDiff =
          team1Norm && team2Norm ? Math.abs(team1Norm - team2Norm) : null;

        matchups.push({
          team1,
          team2,
          quality,
          team1Skill,
          team2Skill,
          team1Norm,
          team2Norm,
          ratingDiff,
        });

        if (normalizedRatings) {
          const team1Norm = normalizedRatings[team1Idx];
          const team2Norm = normalizedRatings[team2Idx];
          const ratingDiff = Math.abs(team1Norm - team2Norm);
          console.log(
            `  Match ${matchIdx + 1}: Team ${team1Idx + 1} (${
              team1.length
            } players, ${team1Skill.toFixed(1)}/${team1Norm.toFixed(
              1,
            )} norm) vs ` +
              `Team ${team2Idx + 1} (${
                team2.length
              } players, ${team2Skill.toFixed(1)}/${team2Norm.toFixed(
                1,
              )} norm) - ` +
              `Norm Diff: ${ratingDiff.toFixed(1)}, Quality: ${quality.toFixed(
                1,
              )}/100`,
          );
        } else {
          const ratingDiff = Math.abs(team1Skill - team2Skill);
          console.log(
            `  Match ${matchIdx + 1}: Team ${team1Idx + 1} (${
              team1.length
            } players, ${team1Skill.toFixed(1)}) vs ` +
              `Team ${team2Idx + 1} (${
                team2.length
              } players, ${team2Skill.toFixed(1)}) - ` +
              `Diff: ${ratingDiff.toFixed(1)}, Quality: ${quality.toFixed(
                1,
              )}/100`,
          );
        }
      }
    }
  }

  // Display match schedule
  displayMatchSchedule(
    teams: Player[][],
    schedule: [number, number][][],
    normalizedRatings: number[] | null = null,
  ): void {
    console.log("\n===== FULL MATCH SCHEDULE =====");

    for (let roundIdx = 0; roundIdx < schedule.length; roundIdx++) {
      console.log(`\nROUND ${roundIdx + 1}:`);

      for (let matchIdx = 0; matchIdx < schedule[roundIdx].length; matchIdx++) {
        const [team1Idx, team2Idx] = schedule[roundIdx][matchIdx];
        const team1 = teams[team1Idx];
        const team2 = teams[team2Idx];
        const quality = this.predictMatchQuality(team1, team2);

        const team1Skill = calculateTeamRating(team1);
        const team2Skill = calculateTeamRating(team2);

        if (normalizedRatings) {
          const team1Norm = normalizedRatings[team1Idx];
          const team2Norm = normalizedRatings[team2Idx];
          const ratingDiff = Math.abs(team1Norm - team2Norm);
          console.log(
            `  Match ${matchIdx + 1}: Team ${team1Idx + 1} (${
              team1.length
            } players, ${team1Skill.toFixed(1)}/${team1Norm.toFixed(
              1,
            )} norm) vs ` +
              `Team ${team2Idx + 1} (${
                team2.length
              } players, ${team2Skill.toFixed(1)}/${team2Norm.toFixed(
                1,
              )} norm) - ` +
              `Norm Diff: ${ratingDiff.toFixed(1)}, Quality: ${quality.toFixed(
                1,
              )}/100`,
          );
        } else {
          const ratingDiff = Math.abs(team1Skill - team2Skill);
          console.log(
            `  Match ${matchIdx + 1}: Team ${team1Idx + 1} (${
              team1.length
            } players, ${team1Skill.toFixed(1)}) vs ` +
              `Team ${team2Idx + 1} (${
                team2.length
              } players, ${team2Skill.toFixed(1)}) - ` +
              `Diff: ${ratingDiff.toFixed(1)}, Quality: ${quality.toFixed(
                1,
              )}/100`,
          );
        }
      }
    }
  }

  // Record game result and update player ratings
  recordGameResult(
    team1: Player[],
    team2: Player[],
    score1: number,
    score2: number,
    date: Date = new Date(),
  ): void {
    // Determine the winning team
    const team1Win = score1 > score2;
    const winningTeam = team1Win ? team1 : team2;
    const losingTeam = team1Win ? team2 : team1;

    // Update player stats
    for (const player of team1) {
      player.gamesPlayed += 1;
      player.wins += team1Win ? 1 : 0;
      player.pointsScored += score1;
      player.pointsAllowed += score2;
      player.lastPlayed = date;
    }

    for (const player of team2) {
      player.gamesPlayed += 1;
      player.wins += !team1Win ? 1 : 0;
      player.pointsScored += score2;
      player.pointsAllowed += score1;
      player.lastPlayed = date;
    }

    // Calculate point difference
    const scoreDiff = Math.abs(score1 - score2);

    // Calculate team average ratings
    const team1Avg = calculateTeamRating(team1);
    const team2Avg = calculateTeamRating(team2);

    // Calculate expected outcome
    const ratingDiff = team1Avg - team2Avg;
    const expectedDiff = ratingDiff / this.beta;

    // Actual vs expected outcome as a normalized result
    const expectedResult = 1 / (1 + Math.exp(-ratingDiff / this.beta));
    const actualResult = team1Win ? 1 : 0;

    // Surprise factor - adjust more if result is unexpected
    const surpriseFactor = Math.abs(actualResult - expectedResult);

    // Calculate base adjustment (higher for unexpected outcomes)
    const baseAdjustment = this.dynamicFactor * surpriseFactor;

    // Apply adjustments to all players
    for (const player of winningTeam) {
      // Player contribution factor (higher sigmas get bigger adjustments)
      const playerFactor = (player.sigma / 100) * 0.5 + 0.5;

      // Adjustment factored by uncertainty
      const adjustment = baseAdjustment * playerFactor;

      // Update player rating
      player.zScore += adjustment;

      // Update uncertainty (reduce sigma as we gain information)
      player.sigma = Math.max(
        10,
        player.sigma * (1 - 0.01 * this.uncertaintyFactor),
      );
    }

    for (const player of losingTeam) {
      // Player contribution factor (higher sigmas get bigger adjustments)
      const playerFactor = (player.sigma / 100) * 0.5 + 0.5;

      // Adjustment factored by uncertainty
      const adjustment = baseAdjustment * playerFactor;

      // Update player rating
      player.zScore -= adjustment;

      // Update uncertainty (reduce sigma as we gain information)
      player.sigma = Math.max(
        10,
        player.sigma * (1 - 0.01 * this.uncertaintyFactor),
      );
    }

    // Update chemistry between teammates (small positive reinforcement)
    for (const team of [team1, team2]) {
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          const player1 = team[i];
          const player2 = team[j];

          // Each player's chemistry with others is tracked separately
          if (!player1.chemistry[player2.name]) {
            player1.chemistry[player2.name] = 0;
          }
          if (!player2.chemistry[player1.name]) {
            player2.chemistry[player1.name] = 0;
          }

          // Small positive reinforcement for playing together
          player1.chemistry[player2.name] += 0.1;
          player2.chemistry[player1.name] += 0.1;
        }
      }
    }

    // Record the game in history
    const gameRecord: GameRecord = {
      date: format(date, "yyyy-MM-dd"),
      team1: team1.map((p) => p.name),
      team2: team2.map((p) => p.name),
      score1,
      score2,
    };

    this.historicalGames.push(gameRecord);
    // this.saveGames();
    // this.savePlayers();

    console.log("\nGame result recorded and player ratings updated.");
  }

  // Reset all player stats
  resetPlayerStats(resetAll = false, playerName: string | null = null): void {
    if (resetAll) {
      for (const name in this.players) {
        const player = this.players[name];
        player.zScore = 100.0;
        player.sigma = 100.0;
        player.gamesPlayed = 0;
        player.wins = 0;
        player.pointsScored = 0;
        player.pointsAllowed = 0;
        player.chemistry = {};
      }
      console.log("All player stats have been reset to default values.");
    } else if (playerName) {
      if (playerName in this.players) {
        const player = this.players[playerName];
        player.zScore = 100.0;
        player.sigma = 100.0;
        player.gamesPlayed = 0;
        player.wins = 0;
        player.pointsScored = 0;
        player.pointsAllowed = 0;
        player.chemistry = {};
        console.log(`${playerName}'s stats have been reset to default values.`);
      } else {
        console.log(`Player '${playerName}' not found.`);
      }
    }

    // this.savePlayers();
  }

  // Manually adjust player ratings or skill groups
  adjustPlayer(
    playerName: string,
    newSkillGroup: string | null = null,
    newRating: number | null = null,
  ): void {
    if (!(playerName in this.players)) {
      console.log(`Player '${playerName}' not found.`);
      return;
    }

    const player = this.players[playerName];
    let isChanged = false;

    if (newSkillGroup !== null) {
      if (!/^[A-F]$/.test(newSkillGroup)) {
        console.log("Skill group must be A-F (where A is best)");
        return;
      }

      player.skillGroup = newSkillGroup;
      player.skillGroupRating = player._getSkillGroupBaseRating();
      isChanged = true;
    }

    if (newRating !== null) {
      if (newRating < 0 || newRating > 200) {
        console.log("Rating must be between 0-200");
        return;
      }

      player.zScore = newRating;
      isChanged = true;
    }

    if (isChanged) {
      console.log(`Player ${playerName} updated to: ${player.toString()}`);
      // this.savePlayers();
    }
  }

  // Calculate team average rating
  calculateTeamRating(team: Player[]): number {
    return average(team.map((p) => p.weightedRating()));
  }

  // Helper for variance calculation
  variance(values: number[]): number {
    const avg = average(values);
    return average(values.map((value) => Math.pow(value - avg, 2)));
  }

  // Helper method to shuffle an array in-place
  shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

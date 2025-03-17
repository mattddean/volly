import { format } from "date-fns";

// Define type for player chemistry tracking
type ChemistryMap = {
  [playerName: string]: number;
};

export class Player {
  name: string;
  skillGroup: string;
  zScore: number;
  sigma: number;
  lastPlayed: Date;
  chemistry: ChemistryMap;
  gamesPlayed: number;
  wins: number;
  pointsScored: number;
  pointsAllowed: number;
  skillGroupRating: number;

  constructor(
    name: string,
    skillGroup: string,
    zScore: number = 100.0,
    sigma: number = 100.0,
    lastPlayed: Date | null = null
  ) {
    this.name = name;
    this.skillGroup = skillGroup; // A-F where A is best
    this.zScore = zScore; // TrueSkill rating (mu)
    this.sigma = sigma; // Uncertainty/confidence interval
    this.lastPlayed = lastPlayed || new Date();

    // Player chemistry tracking
    this.chemistry = {}; // playerName -> chemistry score

    // Historical performance
    this.gamesPlayed = 0;
    this.wins = 0;
    this.pointsScored = 0; // Team points when player is on team
    this.pointsAllowed = 0; // Opponent points when player is on team

    // Calculate skill group base rating
    this.skillGroupRating = this._getSkillGroupBaseRating();
  }

  static getSkillMap(): { [key: string]: number } {
    return {
      A: 160.0,
      B: 120.0,
      C: 100.0,
      D: 80.0,
      E: 40.0,
      F: 0.0,
    };
  }

  public _getSkillGroupBaseRating(): number {
    const skillMap = Player.getSkillMap();
    return skillMap[this.skillGroup] || 100.0;
  }

  effectiveRating(): number {
    return this.zScore - 2 * this.sigma;
  }

  ratingRange(): [number, number] {
    return [this.zScore - 2 * this.sigma, this.zScore + 2 * this.sigma];
  }

  weightedRating(): number {
    // Calculate skill group weight (decreases linearly with more games)
    // Starts at 100%, reduces to 20% after 30 games
    const skillWeight = Math.max(
      0.2,
      Math.min(1.0, 1.0 - (this.gamesPlayed * 0.8) / 30)
    );

    // Blend the ratings
    return (
      skillWeight * this.skillGroupRating + (1 - skillWeight) * this.zScore
    );
  }

  toString(): string {
    // Show skill weight percentage for clarity
    if (this.gamesPlayed < 30) {
      const skillWeight = Math.max(
        0.2,
        Math.min(1.0, 1.0 - (this.gamesPlayed * 0.8) / 30)
      );
      const skillPct = Math.round(skillWeight * 100);
      const weighted = this.weightedRating();
      return `${this.name} (${this.skillGroup}, ${this.zScore.toFixed(
        1
      )}±${this.sigma.toFixed(1)}, w:${weighted.toFixed(1)}, ${skillPct}%sg, ${
        this.gamesPlayed
      }g)`;
    } else {
      // At 30+ games, we maintain 20% skill group influence
      const weighted = this.weightedRating();
      return `${this.name} (${this.skillGroup}, ${this.zScore.toFixed(
        1
      )}±${this.sigma.toFixed(1)}, w:${weighted.toFixed(1)}, 20%sg, ${
        this.gamesPlayed
      }g)`;
    }
  }

  // For serialization to JSON/CSV
  toObject(): any {
    return {
      name: this.name,
      skillGroup: this.skillGroup,
      zScore: this.zScore,
      sigma: this.sigma,
      lastPlayed: format(this.lastPlayed, "yyyy-MM-dd"),
      gamesPlayed: this.gamesPlayed,
      wins: this.wins,
      pointsScored: this.pointsScored,
      pointsAllowed: this.pointsAllowed,
      // Convert chemistry map to array for storage
      chemistry: Object.entries(this.chemistry).map(([name, score]) => ({
        playerName: name,
        score,
      })),
    };
  }

  // Create a player from data object
  static fromObject(obj: any): Player {
    const player = new Player(
      obj["Name"],
      obj["Skill_Group"],
      parseFloat(obj["Z_Score"]),
      parseFloat(obj["Sigma"]),
      obj["LastPlayed"] ? new Date(obj["LastPlayed"]) : new Date()
    );

    player.gamesPlayed = parseInt(obj["GamesPlayed"] || "0");
    player.wins = parseInt(obj["Wins"] || "0");
    player.pointsScored = parseInt(obj["PointsScored"] || "0");
    player.pointsAllowed = parseInt(obj["PointsAllowed"] || "0");

    // Restore chemistry if available
    if (Array.isArray(obj.chemistry)) {
      obj["Chemistry"].forEach((pair: any) => {
        player.chemistry[pair.playerName] = parseFloat(pair.score);
      });
    }

    return player;
  }
}

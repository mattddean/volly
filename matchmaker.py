import csv
import random
import numpy as np
from typing import List, Dict, Tuple, Optional, Set
from datetime import datetime, date, timedelta
import math
import itertools

class Player:
    def __init__(self, name: str, skill_group: str, z_score: float = 100.0, 
                sigma: float = 100.0, last_played: Optional[date] = None):
        self.name = name
        self.skill_group = skill_group  # A-F where A is best
        self.z_score = z_score  # TrueSkill rating (mu)
        self.sigma = sigma      # Uncertainty/confidence interval
        self.last_played = last_played or date.today()
        
        # Player chemistry tracking
        self.chemistry: Dict[str, float] = {}  # player_name -> chemistry score
        
        # Historical performance
        self.games_played = 0
        self.wins = 0
        self.points_scored = 0  # Team points when player is on team
        self.points_allowed = 0  # Opponent points when player is on team
        
        # Calculate skill group base rating
        self.skill_group_rating = self._get_skill_group_base_rating()

    def _get_skill_group_base_rating(self) -> float:
        """Convert letter skill group to a base rating value."""
        skill_map = {
            'A': 160.0,
            'B': 120.0,
            'C': 100.0,
            'D': 80.0,
            'E': 40.0,
            'F': 0.0
        }
        return skill_map.get(self.skill_group, 100.0)

    def effective_rating(self) -> float:
        """Conservative rating estimate (rating - 2*sigma)"""
        return self.z_score - 2 * self.sigma
    
    def rating_range(self) -> Tuple[float, float]:
        """Returns 95% confidence interval of player rating"""
        return (self.z_score - 2 * self.sigma, self.z_score + 2 * self.sigma)
    
    def weighted_rating(self) -> float:
        """
        Calculate a weighted rating that blends skill group and computed rating.
        - With 0 games: 100% skill group based
        - With 30+ games: 20% skill group based (maintains some influence)
        """
        # Calculate skill group weight (decreases linearly with more games)
        # Starts at 100%, reduces to 20% after 30 games
        skill_weight = max(0.2, min(1.0, 1.0 - (self.games_played * 0.8 / 30)))
        
        # Blend the ratings
        return (skill_weight * self.skill_group_rating + 
                (1 - skill_weight) * self.z_score)
    

    def effective_rating(self) -> float:
        """Conservative rating estimate using weighted rating and uncertainty."""
        return self.weighted_rating() - 2 * self.sigma
    
    def __repr__(self):
        """Display player with skill group, rating, and uncertainty."""
        # Show skill weight percentage for clarity
        if self.games_played < 30:
            skill_weight = max(0.2, min(1.0, 1.0 - (self.games_played * 0.8 / 30)))
            skill_pct = int(skill_weight * 100)
            weighted = self.weighted_rating()
            return f"{self.name} ({self.skill_group}, {self.z_score:.1f}±{self.sigma:.1f}, w:{weighted:.1f}, {skill_pct}%sg, {self.games_played}g)"
        else:
            # At 30+ games, we maintain 20% skill group influence
            weighted = self.weighted_rating()
            return f"{self.name} ({self.skill_group}, {self.z_score:.1f}±{self.sigma:.1f}, w:{weighted:.1f}, 20%sg, {self.games_played}g)"
    
class VolleyballMatchmaker:
    def __init__(self, player_file: str, game_file: str, attendance_file: str):
        self.player_file = player_file
        self.game_file = game_file
        self.attendance_file = attendance_file
        self.players: Dict[str, Player] = {}  # All players in system
        self.attending_players: List[Player] = []  # Players for current session
        
        # Chemistry tracking
        self.pair_performances: Dict[Tuple[str, str], List[float]] = {}
        
        # TrueSkill parameters
        self.beta = 20.0  # How much difference in skill translates to score difference
        self.dynamic_factor = 5.0  # Base adjustment factor
        self.uncertainty_factor = 0.5  # How much uncertainty to maintain in the system
        
        # Historical game data
        self.historical_games: List[dict] = []
        
        # Load existing player data and game history
        self.load_players()
        self.load_game_history()
    
    def load_players(self) -> None:
        """Load all players from the player file."""
        try:
            with open(self.player_file, 'r', newline='') as f:
                reader = csv.reader(f)
                try:
                    header = next(reader)  # Try to read header
                except StopIteration:
                    # Empty file, create with header
                    self._create_player_file()
                    return
                
                for row in reader:
                    if not row:  # Skip empty rows
                        continue
                        
                    try:
                        # Extract required fields with defaults for missing data
                        name = row[0] if len(row) > 0 else ""
                        if not name:  # Skip rows without names
                            continue
                            
                        # Default to 'C' skill group if missing
                        skill_group = row[1] if len(row) > 1 and row[1] else 'C'
                        
                        # Handle missing numeric fields with defaults
                        z_score = 100.0  # Default rating
                        if len(row) > 2 and row[2]:
                            try:
                                z_score = float(row[2])
                            except ValueError:
                                pass  # Use default if conversion fails
                        
                        sigma = 100.0  # Default uncertainty
                        if len(row) > 3 and row[3]:
                            try:
                                sigma = float(row[3])
                            except ValueError:
                                pass
                        
                        # Create player with available data
                        player = Player(name, skill_group, z_score, sigma)
                        
                        # Add more fields if available
                        if len(row) > 4 and row[4]:
                            try:
                                player.last_played = datetime.strptime(row[4], "%Y-%m-%d").date()
                            except ValueError:
                                player.last_played = date.today()
                        
                        # Load game stats if available
                        if len(row) > 5 and row[5]:
                            try:
                                player.games_played = int(row[5])
                            except ValueError:
                                player.games_played = 0
                        
                        if len(row) > 6 and row[6]:
                            try:
                                player.wins = int(row[6])
                            except ValueError:
                                player.wins = 0
                                
                        if len(row) > 7 and row[7]:
                            try:
                                player.points_scored = int(row[7])
                            except ValueError:
                                player.points_scored = 0
                                
                        if len(row) > 8 and row[8]:
                            try:
                                player.points_allowed = int(row[8])
                            except ValueError:
                                player.points_allowed = 0
                        
                        # Load chemistry data if available
                        if len(row) > 9 and row[9]:
                            chemistry_data = row[9]
                            try:
                                pairs = chemistry_data.split(';')
                                for pair in pairs:
                                    if ':' in pair:
                                        other_player, score = pair.split(':')
                                        player.chemistry[other_player] = float(score)
                            except:
                                # If chemistry data is malformed, just skip it
                                pass
                        
                        self.players[name] = player
                        
                    except Exception as e:
                        print(f"Error loading player data: {row}. Error: {e}")
                        # Continue loading other players even if one fails
        except FileNotFoundError:
            # Create file with header if it doesn't exist
            self._create_player_file()
    
    def _create_player_file(self) -> None:
        """Create the player file with header."""
        with open(self.player_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Name', 'Skill_Group', 'Z_Score', 'Sigma', 'LastPlayed', 
                            'GamesPlayed', 'Wins', 'PointsScored', 'PointsAllowed', 'Chemistry'])
    
    def save_players(self) -> None:
        """Save all players to the player file."""
        with open(self.player_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Name', 'Skill_Group', 'Z_Score', 'Sigma', 'LastPlayed', 
                            'GamesPlayed', 'Wins', 'PointsScored', 'PointsAllowed', 'Chemistry'])
            for player in self.players.values():
                # Format chemistry data
                chemistry_str = ';'.join([f"{p}:{score}" for p, score in player.chemistry.items()])
                
                writer.writerow([
                    player.name, 
                    player.skill_group, 
                    player.z_score,
                    player.sigma,
                    player.last_played.strftime("%Y-%m-%d"),
                    player.games_played,
                    player.wins,
                    player.points_scored,
                    player.points_allowed,
                    chemistry_str
                ])
    
    def load_game_history(self) -> None:
        """Load past game results for historical analysis."""
        try:
            with open(self.game_file, 'r', newline='') as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) >= 5:  # Date, Team1, Team2, Score1, Score2
                        game_date = datetime.strptime(row[0], "%Y-%m-%d %H:%M").date()
                        team1_names = row[1].split(',')
                        team2_names = row[2].split(',')
                        score1 = int(row[3])
                        score2 = int(row[4])
                        
                        # Store the game data
                        self.historical_games.append({
                            'date': game_date,
                            'team1': team1_names,
                            'team2': team2_names,
                            'score1': score1,
                            'score2': score2
                        })
        except FileNotFoundError:
            # Create file if it doesn't exist
            with open(self.game_file, 'w', newline='') as f:
                pass  # Just create an empty file
    
    def load_attendance(self) -> None:
        """Load the list of attending players."""
        self.attending_players = []
        try:
            with open(self.attendance_file, 'r', newline='') as f:
                reader = csv.reader(f)
                for row in reader:
                    if row and row[0] in self.players:
                        player = self.players[row[0]]
                        player.last_played = date.today()  # Update last played date
                        self.attending_players.append(player)
                    elif row:
                        # Add new player if they don't exist
                        name = row[0]
                        new_player = Player(name, 'C', 100.0, 100.0, date.today())
                        self.players[name] = new_player
                        self.attending_players.append(new_player)
        except FileNotFoundError:
            print(f"Attendance file {self.attendance_file} not found.")
    
    def apply_skill_decay(self) -> None:
        """Apply skill decay for players who haven't played recently."""
        today = date.today()
        for name, player in self.players.items():
            if player.last_played:
                days_inactive = (today - player.last_played).days
                if days_inactive > 30:  # Inactive for more than a month
                    # Decay rate increases with inactivity
                    decay_factor = min(days_inactive / 200, 0.25)  # Max 25% decay
                    
                    # Apply decay toward the mean rating
                    mean_rating = 100.0
                    player.z_score = player.z_score * (1 - decay_factor) + mean_rating * decay_factor
                    
                    # Increase uncertainty
                    player.sigma = min(player.sigma + days_inactive / 30 * 10, 150)

    def record_game(self, team1: List[Player], team2: List[Player], 
                   score1: int, score2: int) -> None:
        """Record game results and update player ratings."""
        # Update last played date for all players
        for player in team1 + team2:
            player.last_played = date.today()
            player.games_played += 1
            
            # Update win count
            if score1 > score2:
                if player in team1:
                    player.wins += 1
            else:
                if player in team2:
                    player.wins += 1
            
            # Update points data
            if player in team1:
                player.points_scored += score1
                player.points_allowed += score2
            else:
                player.points_scored += score2
                player.points_allowed += score1
        
        # Calculate score difference and determine winner
        score_diff = abs(score1 - score2)
        team1_won = score1 > score2
        
        # Update player ratings based on game outcome
        self._update_ratings(team1, team2, team1_won, score1, score2)
        
        # Update chemistry between teammates
        self._update_chemistry(team1, team1_won)
        self._update_chemistry(team2, not team1_won)
        
        # Save game result to history
        with open(self.game_file, 'a', newline='') as f:
            writer = csv.writer(f)
            date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            team1_str = ",".join([p.name for p in team1])
            team2_str = ",".join([p.name for p in team2])
            writer.writerow([date_str, team1_str, team2_str, score1, score2])
        
        # Add to historical games
        self.historical_games.append({
            'date': date.today(),
            'team1': [p.name for p in team1],
            'team2': [p.name for p in team2],
            'score1': score1,
            'score2': score2
        })
        
        # Apply skill decay to all players
        self.apply_skill_decay()
        
        # Save updated player ratings
        self.save_players()
    
    def _update_chemistry(self, team: List[Player], won: bool) -> None:
        """Update chemistry scores between teammates based on game outcome."""
        # Adjust chemistry for all pairs in the team
        for p1, p2 in itertools.combinations(team, 2):
            # Chemistry is bidirectional
            chem_boost = 5 if won else -2
            
            # Initialize chemistry if not present
            if p2.name not in p1.chemistry:
                p1.chemistry[p2.name] = 0
            if p1.name not in p2.chemistry:
                p2.chemistry[p1.name] = 0
            
            # Update chemistry with diminishing returns
            p1.chemistry[p2.name] = p1.chemistry[p2.name] * 0.95 + chem_boost
            p2.chemistry[p1.name] = p2.chemistry[p1.name] * 0.95 + chem_boost
            
            # Track pair performance for analysis
            pair_key = tuple(sorted([p1.name, p2.name]))
            if pair_key not in self.pair_performances:
                self.pair_performances[pair_key] = []
            
            self.pair_performances[pair_key].append(1 if won else 0)
    
    def _update_ratings(self, team1: List[Player], team2: List[Player], 
                    team1_won: bool, score1: int, score2: int) -> None:
        """Update player z-scores using a TrueSkill-inspired bayesian approach."""
        # Calculate team skills using weighted ratings
        team1_skill = sum(p.weighted_rating() for p in team1) / len(team1)
        team2_skill = sum(p.weighted_rating() for p in team2) / len(team2)
        
        # Calculate team uncertainties
        team1_uncertainty = math.sqrt(sum(p.sigma ** 2 for p in team1)) / len(team1)
        team2_uncertainty = math.sqrt(sum(p.sigma ** 2 for p in team2)) / len(team2)
        
        # Calculate performance based on actual outcome and score difference
        score_diff = abs(score1 - score2)
        perf_diff = score_diff * (1 if team1_won else -1)
        
        # Expected performance difference based on ratings
        expected_diff = team1_skill - team2_skill
        
        # Surprise factor - how unexpected was the outcome
        surprise = perf_diff - expected_diff / self.beta
        
        # Dynamic adjustment factor - higher for:
        # 1. Close games (small score_diff)
        # 2. Unexpected outcomes (high surprise)
        # 3. High confidence/low uncertainty (small team_uncertainty)
        adjustment = self.dynamic_factor * (1.0 / (1.0 + 0.1 * score_diff)) * (1.0 + abs(surprise) / 10.0)
        
        # Scale by uncertainty - more certain ratings change less
        total_uncertainty = team1_uncertainty + team2_uncertainty
        adjustment *= min(1, total_uncertainty / 100)
        
        # Calculate team updates - teams with fewer players get larger individual adjustments
        team1_update = adjustment * surprise / len(team1)
        team2_update = -adjustment * surprise / len(team2)
        
        # Update individual players, accounting for their current skill relative to team average
        for player in team1:
            # Players further from team average get adjusted more (regression to mean)
            skill_diff = player.z_score - team1_skill
            individual_update = team1_update - self.uncertainty_factor * (skill_diff / 100)
            
            # Update player rating
            player.z_score += individual_update
            
            # Update uncertainty - decrease with more games, but never below minimum
            player.sigma = max(25, player.sigma * 0.95)
        
        for player in team2:
            skill_diff = player.z_score - team2_skill
            individual_update = team2_update - self.uncertainty_factor * (skill_diff / 100)
            
            # Update player rating
            player.z_score += individual_update
            
            # Update uncertainty
            player.sigma = max(25, player.sigma * 0.95)
    
    def team_chemistry_score(self, team: List[Player]) -> float:
        """Calculate overall team chemistry score."""
        if len(team) <= 1:
            return 0
        
        total_chemistry = 0
        pair_count = 0
        
        for p1, p2 in itertools.combinations(team, 2):
            if p2.name in p1.chemistry:
                total_chemistry += p1.chemistry[p2.name]
                pair_count += 1
        
        return total_chemistry / max(1, pair_count)
    
    def predict_match_quality(self, team1: List[Player], team2: List[Player]) -> float:
        """Predict match quality/closeness (higher is better)."""
        # Base prediction on weighted skill difference
        team1_skill = sum(p.weighted_rating() for p in team1) / len(team1)
        team2_skill = sum(p.weighted_rating() for p in team2) / len(team2)
        
        # Add chemistry bonus
        team1_chemistry = self.team_chemistry_score(team1)
        team2_chemistry = self.team_chemistry_score(team2)
        
        # Adjust skills based on chemistry
        team1_effective = team1_skill + team1_chemistry * 0.2
        team2_effective = team2_skill + team2_chemistry * 0.2
        
        # Calculate predicted score difference
        skill_diff = abs(team1_effective - team2_effective)
        pred_score_diff = skill_diff / 2.5  # ~25 rating points = 1 point difference
        
        # Quality is higher for closer predicted games (25-23 is better than 25-15)
        quality = 100 * (1 / (1 + pred_score_diff/3))
        
        # Account for team uncertainties - less confident predictions get a penalty
        team1_uncertainty = sum(p.sigma for p in team1) / len(team1)
        team2_uncertainty = sum(p.sigma for p in team2) / len(team2)
        avg_uncertainty = (team1_uncertainty + team2_uncertainty) / 2
        
        # Reduce quality if uncertainty is high
        confidence_factor = 100 / (100 + avg_uncertainty)
        quality *= confidence_factor
        
        return quality
    
    def create_teams(self, team_size: int = 6, iterations: int = 500) -> Tuple[List[Player], List[Player]]:
        """Create balanced teams from attending players using optimization."""
        if len(self.attending_players) < team_size * 2:
            print(f"Warning: Not enough players for two teams of size {team_size}")
            team_size = min(team_size, len(self.attending_players) // 2)
        
        # Get available players
        available_players = self.attending_players.copy()
        
        # Determine how many players per team
        players_per_team = min(team_size, len(available_players) // 2)
        
        # Try multiple random combinations and keep the best one
        best_teams = None
        best_quality = -1
        
        for _ in range(iterations):
            # Create random teams
            random.shuffle(available_players)
            team1 = available_players[:players_per_team]
            team2 = available_players[players_per_team:players_per_team*2]
            
            # Calculate match quality
            quality = self.predict_match_quality(team1, team2)
            
            # Keep track of the best match
            if quality > best_quality:
                best_quality = quality
                best_teams = (team1, team2)
        
        team1, team2 = best_teams
        
        # Calculate team statistics for display
        team1_skill = sum(p.weighted_rating() for p in team1) / len(team1)
        team2_skill = sum(p.weighted_rating() for p in team2) / len(team2)
        team1_chem = self.team_chemistry_score(team1)
        team2_chem = self.team_chemistry_score(team2)
        
        print(f"Team 1 - Avg Rating: {team1_skill:.1f}, Chemistry: {team1_chem:.1f}")
        print(f"Team 2 - Avg Rating: {team2_skill:.1f}, Chemistry: {team2_chem:.1f}")
        print(f"Match Quality: {best_quality:.1f}/100")
        
        return team1, team2
    
    def manual_team_feedback(self, team1: List[Player], team2: List[Player], 
                            predicted_winner: int) -> None:
        """Update ratings based on user prediction of which team is stronger."""
        # Simulate a virtual game where the predicted winner wins by a small margin
        if predicted_winner == 1:
            self._update_ratings(team1, team2, True, 25, 22)
        else:
            self._update_ratings(team1, team2, False, 22, 25)

        # Update games played per player
        for player in team1 + team2:
            player.games_played += 1
        
        # Save updated player ratings
        self.save_players()
    
    def get_player_stats(self, player_name: str) -> Dict:
        """Get detailed stats for a specific player."""
        if player_name not in self.players:
            return {"error": "Player not found"}
        
        player = self.players[player_name]
        
        # Get recent games
        recent_games = []
        for game in reversed(self.historical_games):
            if player_name in game['team1'] or player_name in game['team2']:
                in_team1 = player_name in game['team1']
                recent_games.append({
                    'date': game['date'],
                    'team': 1 if in_team1 else 2,
                    'score': f"{game['score1']}-{game['score2']}",
                    'won': (in_team1 and game['score1'] > game['score2']) or 
                           (not in_team1 and game['score2'] > game['score1'])
                })
                if len(recent_games) >= 10:
                    break
        
        # Get best teammates (highest chemistry)
        best_teammates = sorted(
            [(name, score) for name, score in player.chemistry.items()],
            key=lambda x: x[1], reverse=True
        )[:5]
        
        # Calculate win percentage
        win_pct = player.wins / player.games_played * 100 if player.games_played > 0 else 0
        
        # Rating trend
        rating_history = []
        for game in self.historical_games:
            if player_name in game['team1'] or player_name in game['team2']:
                # This would be approximate since we'd need to store historical ratings
                # For a real implementation, we'd track rating after each game
                pass
        
        return {
            'name': player.name,
            'skill_group': player.skill_group,
            'rating': player.z_score,
            'uncertainty': player.sigma,
            'confidence_interval': player.rating_range(),
            'games_played': player.games_played,
            'wins': player.wins,
            'win_percentage': win_pct,
            'points_scored': player.points_scored,
            'points_allowed': player.points_allowed,
            'best_teammates': best_teammates,
            'recent_games': recent_games
        }
    
    def create_multiple_teams(self, team_size: int = 6, num_teams: int = None, iterations: int = 200) -> List[List[Player]]:
        """
        Create multiple balanced teams from all attending players.
        
        Args:
            team_size: Target number of players per team
            num_teams: Specific number of teams to create (if None, creates maximum possible)
            iterations: Number of optimization attempts
            
        Returns:
            List of teams, where each team is a list of players
        """
        available_players = self.attending_players.copy()
        total_players = len(available_players)
        
        # Determine how many teams to create
        max_possible_teams = total_players // team_size
        
        if max_possible_teams == 0:
            print(f"Error: Not enough players to create a team of size {team_size}")
            return []
        
        # Use specified number of teams if provided and valid
        if num_teams is not None:
            if num_teams > max_possible_teams:
                print(f"Warning: Can only create {max_possible_teams} teams with {team_size} players each")
                num_teams = max_possible_teams
        else:
            num_teams = max_possible_teams
        
        print(f"Creating {num_teams} teams with {team_size} players each")
        
        # Calculate how many players will be used/unused
        players_needed = num_teams * team_size
        unused_players = total_players - players_needed
        
        if unused_players > 0:
            print(f"Note: {unused_players} players will be reserves")
        
        # Optimization approach to create balanced teams
        best_teams = None
        best_quality = -1
        
        for _ in range(iterations):
            # Shuffle the players for this iteration
            random.shuffle(available_players)
            
            # Create random teams
            teams = []
            for i in range(num_teams):
                start_idx = i * team_size
                end_idx = start_idx + team_size
                if end_idx <= len(available_players):
                    teams.append(available_players[start_idx:end_idx])
            
            # Skip if we couldn't create enough teams
            if len(teams) < num_teams:
                continue
            
            # Calculate average quality across all possible matchups
            quality_sum = 0
            matchup_count = 0
            
            for i in range(len(teams)):
                for j in range(i+1, len(teams)):
                    quality = self.predict_match_quality(teams[i], teams[j])
                    quality_sum += quality
                    matchup_count += 1
            
            # Calculate average quality and team variance
            avg_quality = quality_sum / max(1, matchup_count)
            
            # Calculate team rating variance (lower is better - means teams are balanced)
            team_ratings = [sum(p.weighted_rating() for p in team) / len(team) for team in teams]
            rating_variance = np.var(team_ratings)
            
            # Combined score: high quality, low variance
            combined_quality = avg_quality - rating_variance / 100
            
            if combined_quality > best_quality:
                best_quality = combined_quality
                best_teams = teams.copy()
        
        # If we couldn't create balanced teams, try with fewer iterations
        if best_teams is None:
            print("Failed to create balanced teams. Using simple division.")
            random.shuffle(available_players)
            best_teams = []
            for i in range(num_teams):
                start_idx = i * team_size
                end_idx = start_idx + team_size
                if end_idx <= len(available_players):
                    best_teams.append(available_players[start_idx:end_idx])
        
        # Display team information
        print("\nTeams created:")
        for i, team in enumerate(best_teams):
            team_skill = sum(p.weighted_rating() for p in team) / len(team)
            team_chem = self.team_chemistry_score(team)
            print(f"Team {i+1} - Avg Rating: {team_skill:.1f}, Chemistry: {team_chem:.1f}")

        # Show all possible matchups and their quality
        print("\nPredicted Matchups:")
        all_matchups = []
        for i in range(len(best_teams)):
            for j in range(i+1, len(best_teams)):
                quality = self.predict_match_quality(best_teams[i], best_teams[j])
                all_matchups.append((i+1, j+1, quality))
        
        # Sort matchups by quality (highest first)
        all_matchups.sort(key=lambda x: x[2], reverse=True)
        
        for team1, team2, quality in all_matchups:
            print(f"Team {team1} vs Team {team2}: Match Quality {quality:.1f}/100")
        
        return best_teams

    def reset_player_stats(self, reset_all: bool = False, player_name: str = None) -> None:
        """
        Reset player statistics while preserving skill group.
        
        Args:
            reset_all: If True, reset all players. If False, reset only the specified player.
            player_name: Name of specific player to reset (when reset_all is False)
        """
        players_to_reset = []
        
        if reset_all:
            players_to_reset = list(self.players.values())
            print(f"Resetting all {len(players_to_reset)} players...")
        elif player_name and player_name in self.players:
            players_to_reset = [self.players[player_name]]
            print(f"Resetting player: {player_name}")
        else:
            print("No valid player specified for reset.")
            return
        
        # Reset each player's stats while keeping their skill group
        for player in players_to_reset:
            skill_group = player.skill_group  # Preserve skill group
            name = player.name  # Preserve name
            
            # Reset to default rating based on skill group
            player.skill_group_rating = player._get_skill_group_base_rating()
            player.z_score = player.skill_group_rating  # Set rating to skill group base
            player.sigma = 100.0  # Reset uncertainty
            player.last_played = date.today()
            
            # Reset performance stats
            player.games_played = 0
            player.wins = 0
            player.points_scored = 0
            player.points_allowed = 0
            
            # Clear chemistry data
            player.chemistry = {}
        
        # Save updated players
        self.save_players()
        print("Player statistics have been reset.")

def main():
    """Main function to run the volleyball matchmaker."""
    matchmaker = VolleyballMatchmaker(
        player_file="players.csv",
        game_file="games.csv",
        attendance_file="attendance.csv"
    )
    
    while True:
        print("\nVolleyball Matchmaker")
        print("1. Load attending players")
        print("2. Create two balanced teams")
        print("3. Create multiple teams")
        print("4. Record game result")
        print("5. Manual team adjustment")
        print("6. View player stats")
        print("7. Reset player stats")
        print("8. Quit")
        
        choice = input("Enter your choice: ")
        
        if choice == "1":
            matchmaker.load_attendance()
            print(f"Loaded {len(matchmaker.attending_players)} players:")
            for player in matchmaker.attending_players:
                print(f"  {player}")
        
        elif choice == "2":
            if not matchmaker.attending_players:
                print("Please load attending players first.")
                continue
            
            team_size = input("Enter team size (default 6): ")
            team_size = int(team_size) if team_size.isdigit() else 6
            
            team1, team2 = matchmaker.create_teams(team_size)
            
            print("\nTeam 1:")
            for player in team1:
                print(f"  {player}")
            
            print("\nTeam 2:")
            for player in team2:
                print(f"  {player}")
        
        elif choice == "3":
            if not matchmaker.attending_players:
                print("Please load attending players first.")
                continue
            
            team_size = input("Enter team size (default 6): ")
            team_size = int(team_size) if team_size.isdigit() else 6
            
            num_teams = input("Enter number of teams (or press Enter for maximum possible): ")
            num_teams = int(num_teams) if num_teams.isdigit() else None
            
            teams = matchmaker.create_multiple_teams(team_size, num_teams)
            
            if teams:
                for i, team in enumerate(teams):
                    print(f"\nTeam {i+1}:")
                    for player in team:
                        print(f"  {player}")
            
        elif choice == "4":
            if not matchmaker.attending_players:
                print("Please load attending players first.")
                continue
            
            # Show options for recording a game
            print("\nRecord game result between:")
            print("1. Two auto-generated teams")
            print("2. Teams from multiple team creation")
            print("3. Manually select teams")
            
            record_choice = input("Enter choice: ")
            
            team1 = []
            team2 = []
            
            if record_choice == "1":
                team1, team2 = matchmaker.create_teams()
            elif record_choice == "2":
                team_size = input("Enter team size (default 6): ")
                team_size = int(team_size) if team_size.isdigit() else 6
                
                teams = matchmaker.create_multiple_teams(team_size)
                
                if len(teams) < 2:
                    print("Need at least 2 teams to record a game.")
                    continue
                
                # Display teams
                for i, team in enumerate(teams):
                    print(f"\nTeam {i+1}:")
                    for player in team:
                        print(f"  {player}")
                
                # Select which teams played
                team1_idx = int(input("\nEnter number for first team: ")) - 1
                team2_idx = int(input("Enter number for second team: ")) - 1
                
                if 0 <= team1_idx < len(teams) and 0 <= team2_idx < len(teams):
                    team1 = teams[team1_idx]
                    team2 = teams[team2_idx]
                else:
                    print("Invalid team numbers.")
                    continue
            elif record_choice == "3":
                # Future implementation for manual team selection
                print("Manual team selection not implemented yet.")
                continue
            else:
                print("Invalid choice.")
                continue
            
            print("\nTeam 1:")
            for i, player in enumerate(team1):
                print(f"  {i+1}. {player}")
            
            print("\nTeam 2:")
            for i, player in enumerate(team2):
                print(f"  {i+1}. {player}")
            
            score1 = int(input("\nEnter score for Team 1: "))
            score2 = int(input("Enter score for Team 2: "))
            
            matchmaker.record_game(team1, team2, score1, score2)
            print("Game recorded and ratings updated.")
        
        elif choice == "5":
            if not matchmaker.attending_players:
                print("Please load attending players first.")
                continue
            
            team1, team2 = matchmaker.create_teams()
            
            print("\nTeam 1:")
            for player in team1:
                print(f"  {player}")
            
            print("\nTeam 2:")
            for player in team2:
                print(f"  {player}")
            
            winner = input("\nWhich team do you think would win? (1/2): ")
            if winner in ["1", "2"]:
                matchmaker.manual_team_feedback(team1, team2, int(winner))
                print("Ratings updated based on your feedback.")
            else:
                print("Invalid input.")
        
        elif choice == "6":
            player_name = input("Enter player name: ")
            if player_name in matchmaker.players:
                stats = matchmaker.get_player_stats(player_name)
                print(f"\nStats for {stats['name']} ({stats['skill_group']}):")
                print(f"Rating: {stats['rating']:.1f} ± {stats['uncertainty']:.1f}")
                print(f"95% Confidence: {stats['confidence_interval'][0]:.1f} - {stats['confidence_interval'][1]:.1f}")
                print(f"Games: {stats['games_played']} Wins: {stats['wins']} ({stats['win_percentage']:.1f}%)")
                print(f"Points: {stats['points_scored']} for, {stats['points_allowed']} against")
                
                print("\nBest Teammates:")
                for name, score in stats['best_teammates']:
                    print(f"  {name}: {score:.1f}")
                
                print("\nRecent Games:")
                for game in stats['recent_games']:
                    result = "W" if game['won'] else "L"
                    print(f"  {game['date']} - Team {game['team']} - {game['score']} - {result}")
            else:
                print(f"Player '{player_name}' not found.")
        
        elif choice == "7":
            print("\nReset player statistics")
            print("1. Reset all players")
            print("2. Reset specific player")
            print("3. Cancel")
            
            reset_choice = input("Enter choice: ")
            
            if reset_choice == "1":
                confirm = input("Are you sure you want to reset ALL player stats? This cannot be undone. (y/n): ")
                if confirm.lower() == 'y':
                    matchmaker.reset_player_stats(reset_all=True)
                else:
                    print("Reset cancelled.")
            
            elif reset_choice == "2":
                player_name = input("Enter player name to reset: ")
                if player_name in matchmaker.players:
                    confirm = input(f"Are you sure you want to reset stats for {player_name}? This cannot be undone. (y/n): ")
                    if confirm.lower() == 'y':
                        matchmaker.reset_player_stats(reset_all=False, player_name=player_name)
                    else:
                        print("Reset cancelled.")
                else:
                    print(f"Player '{player_name}' not found.")
            
            elif reset_choice == "3":
                print("Reset cancelled.")
            
            else:
                print("Invalid choice.")
        
        elif choice == "8":
            break
        
        else:
            print("Invalid choice.")


if __name__ == "__main__":
    main()

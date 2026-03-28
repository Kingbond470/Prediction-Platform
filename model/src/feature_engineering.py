"""
Feature engineering module for IPL Match Predictor.
This is the core module that creates predictive features from historical data.
"""
import logging
from pathlib import Path
from typing import Dict, Tuple, Optional
import pandas as pd
import numpy as np
from datetime import timedelta
from src.config import config
from src.utils.logger import get_logger
from src.utils.helpers import (
    calculate_win_rate,
    safe_divide,
    rolling_window_stats
)

logger = get_logger(__name__)


def load_team_mapping() -> dict:
    """Load team name mapping."""
    import json
    with open(config.TEAM_MAPPING_PATH, 'r') as f:
        mapping = json.load(f)
    return mapping.get("IPL Team Name Mappings", mapping)


def calculate_team_form(
    team: str,
    reference_date: pd.Timestamp,
    historical_df: pd.DataFrame,
    window: int = 5
) -> Dict[str, float]:
    """
    Calculate team's recent form up to reference_date.

    Args:
        team: Team abbreviation
        reference_date: Date up to which we consider matches (prevent leakage)
        historical_df: DataFrame with match data (must include date, team1, team2, winner)
        window: Number of recent matches to consider

    Returns:
        Dictionary with form metrics
    """
    # Filter matches before reference_date where this team played
    team_mask = ((historical_df['team1'] == team) | (historical_df['team2'] == team)) & \
                (historical_df['date'] < reference_date)

    team_matches = historical_df[team_mask].sort_values('date', ascending=False)

    if len(team_matches) == 0:
        return {
            'win_rate': 0.0,
            'avg_margin': 0.0,
            'streak': 0,
            'matches_played': 0,
            'avg_score': 0.0  # Will be populated if deliveries data available
        }

    recent_matches = team_matches.head(window)

    # Calculate wins
    wins = (recent_matches['winner'] == team).sum()
    win_rate = calculate_win_rate(wins, len(recent_matches))

    # Average margin
    margins = recent_matches['result_margin'].fillna(0)
    avg_margin = margins.mean()

    # Streak (most recent match result, positive = winning streak, negative = losing streak)
    if len(recent_matches) > 0:
        recent_wins = (recent_matches['winner'] == team).astype(int)
        streak = 0
        for won in recent_wins:
            if won:
                streak += 1 if streak >= 0 else 1
            else:
                streak = -1 if streak <= 0 else streak - 1
    else:
        streak = 0

    # TODO: Add score statistics if deliveries data available

    return {
        'win_rate': win_rate,
        'avg_margin': float(avg_margin),
        'streak': int(streak),
        'matches_played': len(recent_matches)
    }


def calculate_head_to_head(
    team1: str,
    team2: str,
    reference_date: pd.Timestamp,
    historical_df: pd.DataFrame,
    window: int = 10
) -> Dict[str, float]:
    """
    Calculate head-to-head statistics between two teams.

    Args:
        team1: First team
        team2: Second team
        reference_date: Date up to which to consider matches
        historical_df: Historical matches DataFrame
        window: Number of recent encounters to consider

    Returns:
        Dictionary with H2H metrics
    """
    # Filter matches where these two teams played each other
    h2h_mask = (
        ((historical_df['team1'] == team1) & (historical_df['team2'] == team2)) |
        ((historical_df['team1'] == team2) & (historical_df['team2'] == team1))
    ) & (historical_df['date'] < reference_date)

    h2h_matches = historical_df[h2h_mask].sort_values('date', ascending=False)

    if len(h2h_matches) == 0:
        return {
            f'{team1}_h2h_win_pct': 0.0,
            f'{team2}_h2h_win_pct': 0.0,
            'h2h_matches': 0,
            'h2h_draws': 0
        }

    recent_h2h = h2h_matches.head(window)

    # Count wins for each team
    team1_wins = (recent_h2h['winner'] == team1).sum()
    team2_wins = (recent_h2h['winner'] == team2).sum()
    draws = len(recent_h2h) - team1_wins - team2_wins

    total = len(recent_h2h)
    team1_h2h_pct = calculate_win_rate(team1_wins, total)
    team2_h2h_pct = calculate_win_rate(team2_wins, total)

    return {
        f'{team1}_h2h_win_pct': team1_h2h_pct,
        f'{team2}_h2h_win_pct': team2_h2h_pct,
        'h2h_matches': int(total),
        'h2h_draws': int(draws)
    }


def calculate_venue_performance(
    team: str,
    venue: str,
    reference_date: pd.Timestamp,
    historical_df: pd.DataFrame,
    window: int = 10
) -> Dict[str, float]:
    """
    Calculate team's performance at a specific venue.

    Args:
        team: Team abbreviation
        venue: Venue name
        reference_date: Date up to which to consider matches
        historical_df: Historical matches DataFrame
        window: Number of recent matches at this venue to consider

    Returns:
        Dictionary with venue performance metrics
    """
    # Filter matches at this venue for this team
    venue_mask = (
        (historical_df['team1'] == team) | (historical_df['team2'] == team)
    ) & (historical_df['venue'] == venue) & (historical_df['date'] < reference_date)

    venue_matches = historical_df[venue_mask].sort_values('date', ascending=False)

    if len(venue_matches) == 0:
        return {
            'venue_win_rate': 0.0,
            'venue_matches': 0,
            'venue_avg_margin': 0.0
        }

    recent_venue = venue_matches.head(window)

    # Calculate wins
    wins = (recent_venue['winner'] == team).sum()
    total = len(recent_venue)
    win_rate = calculate_win_rate(wins, total)

    # Average margin
    margins = recent_venue['result_margin'].fillna(0)
    avg_margin = margins.mean()

    return {
        'venue_win_rate': win_rate,
        'venue_matches': int(total),
        'venue_avg_margin': float(avg_margin)
    }


def calculate_season_period(date: pd.Timestamp) -> int:
    """
    Encode the part of the season.
    IPL typically runs from March-May.

    Args:
        date: Match date

    Returns:
        Integer encoding: 0=early, 1=mid, 2=late
    """
    month = date.month
    day = date.day

    if (month == 3) or (month == 4 and day <= 15):
        return 0  # Early
    elif month == 5 or (month == 4 and day > 15):
        return 1  # Mid/late (IPL usually ends late May)
    else:
        return 0  # Default to early


def add_match_context_features(
    match_row: pd.Series,
    historical_df: pd.DataFrame
) -> pd.Series:
    """
    Add context features for a single match by combining team statistics.

    Args:
        match_row: Series with basic match info (team1, team2, venue, date, toss_winner, toss_decision)
        historical_df: Historical matches for calculating stats

    Returns:
        Enriched match Series with additional features
    """
    team1 = match_row['team1']
    team2 = match_row['team2']
    venue = match_row['venue']
    match_date = match_row['date']
    toss_winner = match_row.get('toss_winner', None)
    toss_decision = match_row.get('toss_decision', None)

    features = match_row.copy()

    # Team form features
    team1_form = calculate_team_form(team1, match_date, historical_df, window=config.features.get('form_window', 5))
    team2_form = calculate_team_form(team2, match_date, historical_df, window=config.features.get('form_window', 5))

    features['team1_win_rate_last5'] = team1_form['win_rate']
    features['team2_win_rate_last5'] = team2_form['win_rate']
    features['team1_streak'] = team1_form['streak']
    features['team2_streak'] = team2_form['streak']

    # Head-to-head features
    h2h_stats = calculate_head_to_head(team1, team2, match_date, historical_df, window=config.features.get('h2h_window', 10))
    features['team1_h2h_win_pct'] = h2h_stats[f'{team1}_h2h_win_pct']
    features['team2_h2h_win_pct'] = h2h_stats[f'{team2}_h2h_win_pct']
    features['h2h_matches_played'] = h2h_stats['h2h_matches']

    # Venue performance features
    team1_venue = calculate_venue_performance(team1, venue, match_date, historical_df, window=config.features.get('venue_window', 10))
    team2_venue = calculate_venue_performance(team2, venue, match_date, historical_df, window=config.features.get('venue_window', 10))

    features['team1_venue_win_rate'] = team1_venue['venue_win_rate']
    features['team2_venue_win_rate'] = team2_venue['venue_win_rate']
    features['team1_venue_matches'] = team1_venue['venue_matches']
    features['team2_venue_matches'] = team2_venue['venue_matches']

    # Toss features (handle missing/NaN safely)
    if toss_winner is not None and toss_decision is not None and pd.notna(toss_winner) and pd.notna(toss_decision):
        toss_winner_standard = standardize_team_name(toss_winner, load_team_mapping())
        features['toss_winner_is_team1'] = 1 if toss_winner_standard == team1 else 0
        features['toss_decision_encoded'] = 1 if str(toss_decision).lower() == 'bat' else 0
    else:
        features['toss_winner_is_team1'] = np.nan
        features['toss_decision_encoded'] = np.nan

    # Date features
    features['day_of_week'] = match_date.weekday()
    features['month'] = match_date.month
    features['season_period'] = calculate_season_period(match_date)

    # Derived features
    features['form_diff'] = team1_form['win_rate'] - team2_form['win_rate']
    features['venue_form_diff'] = team1_venue['venue_win_rate'] - team2_venue['venue_win_rate']
    features['h2h_win_pct_diff'] = h2h_stats.get(f'{team1}_h2h_win_pct', 0) - \
                                    h2h_stats.get(f'{team2}_h2h_win_pct', 0)

    # Target (will be set separately)
    if 'winner' in match_row and pd.notna(match_row['winner']):
        features['winner'] = match_row['winner']
        winner_standard = standardize_team_name(match_row['winner'], load_team_mapping())
        features['winner_encoded'] = 1 if winner_standard == team2 else 0

    return features


def standardize_team_name(team_name: str, team_mapping: dict) -> str:
    """Helper to standardize team names using mapping."""
    if pd.isna(team_name):
        return team_name

    team_name = str(team_name).strip()
    if team_name in team_mapping:
        return team_mapping[team_name]

    team_lower = team_name.lower()
    for key, value in team_mapping.items():
        if key.lower() == team_lower:
            return value

    return team_name


# Note: This configuration needs to be loaded correctly
config = __import__('src.config', fromlist=['config']).config if 'config' not in globals() else config


def build_feature_store(
    matches_df: pd.DataFrame,
    deliveries_df: Optional[pd.DataFrame] = None,
    save: bool = True
) -> pd.DataFrame:
    """
    Build complete feature matrix for all historical matches.

    Args:
        matches_df: Cleaned matches DataFrame
        deliveries_df: Cleaned deliveries DataFrame (optional)
        save: Whether to save the feature matrix to disk

    Returns:
        Feature matrix DataFrame (one row per match)
    """
    logger.info("=" * 50)
    logger.info("Building feature store")
    logger.info("=" * 50)

    # Load team mapping
    team_mapping = load_team_mapping()

    # Ensure matches are sorted by date
    matches_df = matches_df.sort_values('date').copy()

    # List to collect feature dictionaries
    features_list = []

    total_matches = len(matches_df)

    for idx, (_, match) in enumerate(matches_df.iterrows()):
        if (idx + 1) % 50 == 0:
            logger.info(f"Processing match {idx + 1}/{total_matches}")

        # Add context features
        try:
            match_features = add_match_context_features(match, matches_df)
            features_list.append(match_features)
        except Exception as e:
            logger.warning(f"Error processing match {match.get('match_id', idx)}: {e}")
            continue

    feature_df = pd.DataFrame(features_list)

    # Drop rows where we couldn't compute features (e.g., insufficient history)
    initial_len = len(feature_df)
    # Keep rows where key features are not NaN
    key_features = [
        'team1_win_rate_last5',
        'team2_win_rate_last5',
        'team1_h2h_win_pct',
        'team2_h2h_win_pct'
    ]
    feature_df = feature_df.dropna(subset=key_features)
    dropped = initial_len - len(feature_df)
    if dropped > 0:
        logger.info(f"Dropped {dropped} matches with insufficient history for feature calculation")

    # Encode categorical features
    feature_df = encode_categoricals(feature_df)

    # Final validation
    logger.info(f"Feature store created: {len(feature_df)} rows, {len(feature_df.columns)} columns")
    logger.info(f"Features: {list(feature_df.columns)}")

    # Save if requested
    if save:
        output_path = config.PROCESSED_DATA_DIR / "feature_matrix.csv"
        feature_df.to_csv(output_path, index=False)
        logger.info(f"Saved feature matrix to {output_path}")

    logger.info("=" * 50)
    logger.info("Feature store build completed")
    logger.info("=" * 50)

    return feature_df


def encode_categoricals(
    df: pd.DataFrame,
    categorical_cols: Optional[list] = None,
    save_mappings: bool = True
) -> pd.DataFrame:
    """
    Encode categorical variables using label encoding.
    Extends the version in preprocessing to handle new columns.
    """
    from src.preprocessing import encode_categoricals as base_encode
    return base_encode(df, categorical_cols, save_mappings)


if __name__ == "__main__":
    # Quick test
    try:
        from src.preprocessing import clean_and_merge_data
        matches_df, _ = clean_and_merge_data()
        feature_df = build_feature_store(matches_df)
        print(f"Feature store shape: {feature_df.shape}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

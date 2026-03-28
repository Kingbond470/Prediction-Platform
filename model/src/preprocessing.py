"""
Data preprocessing module for IPL Match Predictor.
Handles cleaning, merging, and preparing data for feature engineering.
"""
import logging
from pathlib import Path
from typing import Tuple, Optional
import pandas as pd
from src.config import config
from src.utils.logger import get_logger
from src.utils.validation import validate_schema, check_missing_values, validate_date_column
from src.utils.helpers import save_json
import json

logger = get_logger(__name__)


def load_team_mapping() -> dict:
    """Load team name mapping from JSON file."""
    with open(config.TEAM_MAPPING_PATH, 'r') as f:
        mapping = json.load(f)
    # The JSON has a nested structure; return the inner mapping
    return mapping.get("IPL Team Name Mappings", mapping)


def standardize_team_name(team_name: str, team_mapping: dict) -> str:
    """
    Map a team name to its canonical abbreviation.

    Args:
        team_name: Original team name
        team_mapping: Dictionary mapping various names to canonical abbreviations

    Returns:
        Standardized team abbreviation
    """
    if pd.isna(team_name):
        return team_name

    # Clean the input
    team_name = str(team_name).strip()

    # Direct lookup
    if team_name in team_mapping:
        return team_mapping[team_name]

    # Case-insensitive lookup
    team_lower = team_name.lower()
    for key, value in team_mapping.items():
        if key.lower() == team_lower:
            return value

    logger.warning(f"Unrecognized team name: '{team_name}'. Returning as-is.")
    return team_name


def clean_matches_data(df: pd.DataFrame, team_mapping: dict) -> pd.DataFrame:
    """
    Clean and preprocess the matches DataFrame.

    Args:
        df: Raw matches DataFrame
        team_mapping: Dictionary for team name standardization

    Returns:
        Cleaned matches DataFrame
    """
    logger.info("Cleaning matches data...")

    # Create a copy to avoid modifying original
    df_clean = df.copy()

    # Standardize column names (lowercase, no spaces)
    df_clean.columns = df_clean.columns.str.lower().str.replace(' ', '_')

    # Essential columns to keep
    essential_cols = ['id', 'season', 'date', 'team1', 'team2', 'venue',
                      'city', 'toss_winner', 'toss_decision', 'winner', 'result', 'result_margin']

    # Keep only columns that exist in the data
    available_cols = [col for col in essential_cols if col in df_clean.columns]
    df_clean = df_clean[available_cols]

    # Rename 'id' to 'match_id' for clarity
    if 'id' in df_clean.columns:
        df_clean = df_clean.rename(columns={'id': 'match_id'})

    # Parse dates
    if 'date' in df_clean.columns:
        df_clean['date'] = pd.to_datetime(df_clean['date'], errors='coerce')
        # Check for invalid dates
        invalid_dates = df_clean['date'].isna().sum()
        if invalid_dates > 0:
            logger.warning(f"Found {invalid_dates} invalid date entries. Dropping these rows.")
            df_clean = df_clean.dropna(subset=['date'])

    # Standardize team names
    team_cols = ['team1', 'team2', 'toss_winner', 'winner']
    for col in team_cols:
        if col in df_clean.columns:
            df_clean[col] = df_clean[col].apply(lambda x: standardize_team_name(x, team_mapping))

    # Handle missing winners (no result matches)
    if 'winner' in df_clean.columns:
        initial_len = len(df_clean)
        df_clean = df_clean.dropna(subset=['winner'])
        if len(df_clean) < initial_len:
            logger.info(f"Dropped {initial_len - len(df_clean)} matches with missing winner")

    # Validate date column
    if 'date' in df_clean.columns:
        validate_date_column(df_clean, 'date')

    # Reset index
    df_clean = df_clean.reset_index(drop=True)

    logger.info(f"Cleaned matches data: {len(df_clean)} rows, {len(df_clean.columns)} columns")
    logger.info(f"Columns: {list(df_clean.columns)}")

    return df_clean


def clean_deliveries_data(df: pd.DataFrame, team_mapping: dict) -> pd.DataFrame:
    """
    Clean and preprocess the deliveries (ball-by-ball) DataFrame.

    Args:
        df: Raw deliveries DataFrame
        team_mapping: Dictionary for team name standardization

    Returns:
        Cleaned deliveries DataFrame
    """
    logger.info("Cleaning deliveries data...")

    df_clean = df.copy()

    # Standardize column names
    df_clean.columns = df_clean.columns.str.lower().str.replace(' ', '_')

    # Parse date if exists (usually not in ball-by-ball)
    if 'date' in df_clean.columns:
        df_clean['date'] = pd.to_datetime(df_clean['date'], errors='coerce')

    # Standardize team names
    team_cols = ['batting_team', 'bowling_team']
    for col in team_cols:
        if col in df_clean.columns:
            df_clean[col] = df_clean[col].apply(lambda x: standardize_team_name(x, team_mapping))

    # Fill missing numeric values with 0 for runs, etc.
    numeric_fill_cols = ['runs_off_bat', 'extras', 'wides', 'noballs', 'byes', 'legbyes']
    for col in numeric_fill_cols:
        if col in df_clean.columns:
            df_clean[col] = df_clean[col].fillna(0)

    # Clean player names (strip whitespace)
    player_cols = ['batter', 'bowler', 'non_striker', 'fielder']
    for col in player_cols:
        if col in df_clean.columns:
            df_clean[col] = df_clean[col].astype(str).str.strip()
            # Replace 'nan' strings with actual NaN
            df_clean[col] = df_clean[col].replace('nan', pd.NA)

    logger.info(f"Cleaned deliveries data: {len(df_clean)} rows, {len(df_clean.columns)} columns")

    return df_clean


def merge_match_deliveries(
    matches_df: pd.DataFrame,
    deliveries_df: Optional[pd.DataFrame] = None
) -> pd.DataFrame:
    """
    Merge matches and deliveries data if available.

    Args:
        matches_df: Cleaned matches DataFrame
        deliveries_df: Cleaned deliveries DataFrame (optional)

    Returns:
        Enriched DataFrame or just matches if deliveries not available
    """
    if deliveries_df is None:
        logger.info("No deliveries data available, returning matches only")
        return matches_df

    logger.info("Merging matches with deliveries data...")

    # Ensure match_id column exists and has consistent dtype
    if 'match_id' not in deliveries_df.columns:
        # Sometimes deliveries data uses 'match_id' or 'match' or other names
        # Try to find match identifier column
        potential_cols = ['match_id', 'match', 'game_id', 'matchid']
        for col in potential_cols:
            if col in deliveries_df.columns:
                deliveries_df = deliveries_df.rename(columns={col: 'match_id'})
                break

    if 'match_id' not in deliveries_df.columns:
        logger.warning("Could not find match_id in deliveries data, skipping merge")
        return matches_df

    # Convert match_id to same type
    matches_df['match_id'] = matches_df['match_id'].astype(str)
    deliveries_df['match_id'] = deliveries_df['match_id'].astype(str)

    # Aggregate delivery-level stats per match
    # For example, total runs per match, total wickets, etc.
    match_aggregates = deliveries_df.groupby('match_id').agg({
        'runs_off_bat': 'sum',
        'extras': 'sum',
        'wicket': 'sum' if 'wicket' in deliveries_df.columns else None,
        'over': 'max' if 'over' in deliveries_df.columns else None
    }).reset_index()

    # Rename aggregated columns
    agg_rename = {
        'runs_off_bat': 'total_runs',
        'extras': 'total_extras'
    }
    if 'wicket' in match_aggregates.columns:
        agg_rename['wicket'] = 'total_wickets'
    if 'over' in match_aggregates.columns:
        agg_rename['over'] = 'total_overs'

    match_aggregates = match_aggregates.rename(columns=agg_rename)

    # Merge with matches
    merged_df = pd.merge(
        matches_df,
        match_aggregates,
        on='match_id',
        how='left'
    )

    logger.info(f"Merged data shape: {merged_df.shape}")

    return merged_df


def handle_missing_values(df: pd.DataFrame, strategy: str = 'median') -> pd.DataFrame:
    """
    Handle missing values in DataFrame.

    Args:
        df: Input DataFrame
        strategy: Imputation strategy ('median', 'mean', 'mode', 'zero')

    Returns:
        DataFrame with missing values handled
    """
    df_clean = df.copy()

    for col in df_clean.columns:
        if df_clean[col].dtype in ['int64', 'float64']:
            # Numeric column
            if df_clean[col].isna().any():
                if strategy == 'median':
                    fill_value = df_clean[col].median()
                elif strategy == 'mean':
                    fill_value = df_clean[col].mean()
                elif strategy == 'zero':
                    fill_value = 0
                else:
                    fill_value = 0

                df_clean[col] = df_clean[col].fillna(fill_value)
                logger.debug(f"Filled missing in {col} with {fill_value}")

    return df_clean


def encode_categoricals(
    df: pd.DataFrame,
    categorical_cols: Optional[list] = None,
    save_mappings: bool = True
) -> pd.DataFrame:
    """
    Encode categorical variables using label encoding.

    Args:
        df: Input DataFrame
        categorical_cols: List of categorical columns to encode (None = auto-detect)
        save_mappings: Whether to save encoder mappings for inference

    Returns:
        DataFrame with encoded categoricals
    """
    df_encoded = df.copy()

    if categorical_cols is None:
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

    # Ensure target column 'winner' is encoded properly
    if 'winner' in categorical_cols:
        if 'winner_encoded' not in df.columns:
            # Create binary target: 1 if team2 wins, 0 if team1 wins
            df_encoded['winner_encoded'] = (df_encoded['winner'] == df_encoded['team2']).astype(int)
            logger.info("Created target variable 'winner_encoded'")
        # Remove 'winner' from categorical_cols to avoid label encoding it
        categorical_cols = [c for c in categorical_cols if c != 'winner']

    # Save mappings for later use (for inference)
    mappings = {}
    for col in categorical_cols:
        if col in df_encoded.columns and col != 'winner_encoded':
            # Create mapping: unique values -> integers
            unique_vals = df_encoded[col].dropna().unique()
            mapping = {val: idx for idx, val in enumerate(sorted(unique_vals))}
            df_encoded[f'{col}_encoded'] = df_encoded[col].map(mapping)
            mappings[col] = mapping

            logger.debug(f"Encoded {col}: {len(mapping)} unique values")

    if save_mappings and mappings:
        mapping_path = config.CONFIG_DIR / "categorical_mappings.json"
        save_json(mappings, mapping_path)
        logger.info(f"Saved categorical mappings to {mapping_path}")

    return df_encoded


def save_processed_data(df: pd.DataFrame, filename: str) -> Path:
    """
    Save processed DataFrame to CSV.

    Args:
        df: DataFrame to save
        filename: Output filename

    Returns:
        Path to saved file
    """
    output_path = config.PROCESSED_DATA_DIR / filename
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    logger.info(f"Saved processed data to {output_path}")
    return output_path


def clean_and_merge_data(
    matches_path: Optional[Path] = None,
    deliveries_path: Optional[Path] = None
) -> Tuple[pd.DataFrame, Optional[pd.DataFrame]]:
    """
    Complete preprocessing pipeline.

    Args:
        matches_path: Path to raw matches CSV (default from config)
        deliveries_path: Path to raw deliveries CSV (default from config)

    Returns:
        Tuple of (cleaned_matches_df, cleaned_deliveries_df or None)
    """
    logger.info("=" * 50)
    logger.info("Starting data preprocessing")
    logger.info("=" * 50)

    # Load team mapping
    team_mapping = load_team_mapping()

    # Load raw data
    if matches_path is None:
        matches_path = config.RAW_MATCHES_PATH
    if deliveries_path is None:
        deliveries_path = config.RAW_DELIVERIES_PATH

    if not matches_path.exists():
        raise FileNotFoundError(f"Matches file not found: {matches_path}")

    logger.info(f"Loading matches from {matches_path}")
    matches_raw = pd.read_csv(matches_path)

    deliveries_raw = None
    if deliveries_path and deliveries_path.exists():
        logger.info(f"Loading deliveries from {deliveries_path}")
        deliveries_raw = pd.read_csv(deliveries_path)

    # Clean matches
    matches_clean = clean_matches_data(matches_raw, team_mapping)

    # Clean deliveries if available
    deliveries_clean = None
    if deliveries_raw is not None:
        deliveries_clean = clean_deliveries_data(deliveries_raw, team_mapping)

    # Merge
    merged_df = merge_match_deliveries(matches_clean, deliveries_clean)

    # Handle missing values
    merged_df = handle_missing_values(merged_df)

    # Encode categoricals
    merged_df = encode_categoricals(merged_df)

    # Save cleaned data
    save_processed_data(merged_df, "cleaned_matches.csv")
    if deliveries_clean is not None:
        save_processed_data(deliveries_clean, "cleaned_deliveries.csv")

    logger.info("=" * 50)
    logger.info("Preprocessing completed")
    logger.info("=" * 50)

    return merged_df, deliveries_clean


if __name__ == "__main__":
    try:
        matches_df, deliveries_df = clean_and_merge_data()
        print(f"Preprocessing successful. Output shape: {matches_df.shape}")
        if deliveries_df is not None:
            print(f"Deliveries shape: {deliveries_df.shape}")
    except Exception as e:
        print(f"Error: {e}")
        exit(1)

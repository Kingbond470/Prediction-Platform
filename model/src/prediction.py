"""
Prediction module for IPL Match Predictor.
Handles loading trained models and generating predictions for matches.
"""
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
import joblib
from src.config import config
from src.utils.logger import get_logger
from src.feature_engineering import add_match_context_features, load_team_mapping
from src.preprocessing import clean_matches_data

logger = get_logger(__name__)


def load_model(model_path: Path) -> Any:
    """
    Load trained model from disk.

    Args:
        model_path: Path to saved model file (.pkl or .joblib)

    Returns:
        Loaded model object
    """
    logger.info(f"Loading model from {model_path}")
    model = joblib.load(model_path)
    logger.info("Model loaded successfully")
    return model


def load_scaler(scaler_path: Path) -> Any:
    """
    Load fitted scaler from disk.

    Args:
        scaler_path: Path to saved scaler file

    Returns:
        Loaded scaler object
    """
    logger.info(f"Loading scaler from {scaler_path}")
    scaler = joblib.load(scaler_path)
    logger.info("Scaler loaded successfully")
    return scaler


def prepare_match_features(
    match_info: Dict[str, Any],
    historical_matches: pd.DataFrame,
    team_mapping: Optional[dict] = None
) -> pd.DataFrame:
    """
    Prepare feature vector for a single match.

    Args:
        match_info: Dictionary with match details
            Required keys: team1, team2, venue, date, toss_winner, toss_decision
        historical_matches: DataFrame of historical matches for feature calculation
        team_mapping: Optional team name mapping

    Returns:
        DataFrame with single row of features
    """
    if team_mapping is None:
        team_mapping = load_team_mapping()

    # Standardize team names
    team1 = match_info['team1']
    team2 = match_info['team2']
    toss_winner = match_info.get('toss_winner')
    toss_decision = match_info.get('toss_decision')

    # Apply mapping
    team1_std = team_mapping.get(team1, team1)
    team2_std = team_mapping.get(team2, team2)
    toss_winner_std = team_mapping.get(toss_winner, toss_winner) if toss_winner else None

    # Ensure date is Timestamp
    match_date = pd.to_datetime(match_info['date'])

    # Create a match Series similar to what's in historical data
    match_series = pd.Series({
        'match_id': match_info.get('match_id', 'unknown'),
        'team1': team1_std,
        'team2': team2_std,
        'venue': match_info['venue'],
        'date': match_date,
        'toss_winner': toss_winner_std,
        'toss_decision': toss_decision,
        'winner': match_info.get('winner')  # May be None for future matches
    })

    # Add context features using historical data
    try:
        feature_series = add_match_context_features(match_series, historical_matches)
    except Exception as e:
        logger.error(f"Error generating features: {e}")
        raise

    # Extract only the feature columns (excluding target and identifiers)
    feature_cols = [
        'team1_win_rate_last5',
        'team2_win_rate_last5',
        'team1_h2h_win_pct',
        'team2_h2h_win_pct',
        'team1_venue_win_rate',
        'team2_venue_win_rate',
        'toss_winner_is_team1',
        'toss_decision_encoded',
        'form_diff',
        'venue_form_diff',
        'h2h_win_pct_diff',
        'season_period'
    ]

    # Filter to existing features
    available_features = [col for col in feature_cols if col in feature_series.index]
    features_df = pd.DataFrame([feature_series[available_features]])

    # Handle any remaining NaN values
    features_df = features_df.fillna(0)

    return features_df


def predict_match(
    model: Any,
    features: pd.DataFrame,
    team1_name: str,
    team2_name: str
) -> Dict[str, Any]:
    """
    Predict winner for a single match.

    Args:
        model: Trained model with predict_proba
        features: Feature DataFrame for the match
        team1_name: Original name of team1 (for output)
        team2_name: Original name of team2 (for output)

    Returns:
        Dictionary with prediction results
    """
    # Convert to numpy array if DataFrame to avoid XGBoost issues
    X = features.values if isinstance(features, pd.DataFrame) else features
    # Get probabilities
    proba = model.predict_proba(X)[0]
    prob_team1, prob_team2 = proba[0], proba[1]

    # Determine predicted winner
    if prob_team1 > prob_team2:
        predicted_winner = team1_name
        confidence = prob_team1 - prob_team2
    else:
        predicted_winner = team2_name
        confidence = prob_team2 - prob_team1

    # Ensure confidence is positive (absolute difference)
    confidence = abs(confidence)

    return {
        'predicted_winner': predicted_winner,
        'prob_team1': float(prob_team1),
        'prob_team2': float(prob_team2),
        'confidence': float(confidence)
    }


def predict_batch(
    model: Any,
    scaler: Any,
    fixtures_df: pd.DataFrame,
    historical_matches: pd.DataFrame,
    feature_cols: List[str]
) -> pd.DataFrame:
    """
    Generate predictions for multiple matches.

    Args:
        model: Trained model
        scaler: Fitted scaler
        fixtures_df: DataFrame with match fixtures
            Required columns: team1, team2, venue, date (optional: toss_winner, toss_decision)
        historical_matches: DataFrame for historical feature calculation
        feature_cols: List of feature columns expected by model

    Returns:
        DataFrame with predictions for each match
    """
    predictions = []

    for idx, match in fixtures_df.iterrows():
        match_info = match.to_dict()

        # Skip if essential columns missing
        if pd.isna(match_info.get('team1')) or pd.isna(match_info.get('team2')):
            logger.warning(f"Skipping match {match_info.get('match_id', idx)}: missing team information")
            continue

        try:
            # Prepare features
            features = prepare_match_features(match_info, historical_matches)

            # Align columns with expected feature order
            # Add missing columns with 0
            for col in feature_cols:
                if col not in features.columns:
                    features[col] = 0.0

            # Reorder columns to match training order
            features = features[feature_cols]

            # Scale features
            features_scaled = pd.DataFrame(
                scaler.transform(features),
                columns=features.columns,
                index=features.index
            )

            # Convert to numpy array to avoid XGBoost DataFrame issues
            X_pred = features_scaled.values if isinstance(features_scaled, pd.DataFrame) else features_scaled

            # Get prediction
            proba = model.predict_proba(X_pred)[0]
            prob_team1, prob_team2 = proba[0], proba[1]

            # Determine winner
            if prob_team1 > prob_team2:
                predicted_winner = match_info['team1']
                confidence = float(prob_team1 - prob_team2)
            else:
                predicted_winner = match_info['team2']
                confidence = float(prob_team2 - prob_team1)

            # Build result dictionary
            result = {
                'match_id': match_info.get('match_id', idx),
                'team1': match_info['team1'],
                'team2': match_info['team2'],
                'venue': match_info['venue'],
                'date': match_info.get('date'),
                'toss_winner': match_info.get('toss_winner'),
                'toss_decision': match_info.get('toss_decision'),
                'predicted_winner': predicted_winner,
                'prob_team1': float(prob_team1),
                'prob_team2': float(prob_team2),
                'confidence': abs(confidence)
            }
            predictions.append(result)

        except Exception as e:
            logger.error(f"Error predicting match {match_info.get('match_id', idx)}: {e}")
            # Add placeholder with error
            predictions.append({
                'match_id': match_info.get('match_id', idx),
                'team1': match_info.get('team1'),
                'team2': match_info.get('team2'),
                'venue': match_info.get('venue'),
                'error': str(e)
            })

    predictions_df = pd.DataFrame(predictions)
    return predictions_df


def load_2026_fixtures(fixtures_path: Optional[Path] = None) -> pd.DataFrame:
    """
    Load 2026 season fixtures.

    Args:
        fixtures_path: Path to fixtures CSV

    Returns:
        DataFrame with fixture information
    """
    if fixtures_path is None:
        fixtures_path = config.IPL_2026_FIXTURES_PATH

    if not fixtures_path.exists():
        raise FileNotFoundError(f"Fixtures file not found: {fixtures_path}")

    logger.info(f"Loading fixtures from {fixtures_path}")
    # Skip comment lines starting with '#'
    fixtures_df = pd.read_csv(fixtures_path, comment='#')

    # Ensure required columns exist
    required_cols = ['team1', 'team2', 'venue']
    missing = [col for col in required_cols if col not in fixtures_df.columns]
    if missing:
        raise ValueError(f"Fixtures CSV missing required columns: {missing}")

    # Parse date if present
    if 'date' in fixtures_df.columns:
        fixtures_df['date'] = pd.to_datetime(fixtures_df['date'])

    logger.info(f"Loaded {len(fixtures_df)} fixtures")
    return fixtures_df


def generate_2026_predictions(
    model_path: Optional[Path] = None,
    scaler_path: Optional[Path] = None,
    fixtures_path: Optional[Path] = None,
    feature_matrix_path: Optional[Path] = None
) -> pd.DataFrame:
    """
    Complete pipeline to generate predictions for 2026 season.

    Args:
        model_path: Path to trained model
        scaler_path: Path to fitted scaler
        fixtures_path: Path to 2026 fixtures CSV
        feature_matrix_path: Path to feature matrix for historical data

    Returns:
        DataFrame with predictions
    """
    logger.info("=" * 50)
    logger.info("Generating 2026 IPL predictions")
    logger.info("=" * 50)

    # Use defaults from config if not provided
    if model_path is None:
        model_path = config.BEST_MODEL_PATH
    if scaler_path is None:
        scaler_path = config.SCALER_PATH
    if fixtures_path is None:
        fixtures_path = config.IPL_2026_FIXTURES_PATH
    if feature_matrix_path is None:
        feature_matrix_path = config.FEATURE_MATRIX_PATH

    # Load model and scaler
    model = load_model(model_path)
    scaler = load_scaler(scaler_path)

    # Load historical matches (for feature calculation)
    logger.info(f"Loading historical feature matrix from {feature_matrix_path}")
    if not feature_matrix_path.exists():
        raise FileNotFoundError(f"Feature matrix not found: {feature_matrix_path}")

    feature_df = pd.read_csv(feature_matrix_path)
    feature_df['date'] = pd.to_datetime(feature_df['date'])

    # Load fixtures
    fixtures_df = load_2026_fixtures(fixtures_path)

    # Determine feature columns (we need the list of features the model was trained on)
    # We can try to infer from model if it's a tree-based model, or we need to save this info
    # For now, derive from config
    config_yaml_path = config.MAIN_CONFIG_PATH
    import yaml
    with open(config_yaml_path, 'r') as f:
        cfg = yaml.safe_load(f)

    numerical_cols = cfg['features']['numerical_columns']
    categorical_encoded = [f"{col}_encoded" for col in cfg['features']['categorical_columns']]
    derived_features = ['form_diff', 'venue_form_diff', 'h2h_win_pct_diff']
    feature_cols = numerical_cols + categorical_encoded + derived_features
    feature_cols = [col for col in feature_cols if col in feature_df.columns]

    logger.info(f"Using {len(feature_cols)} features for prediction")
    logger.debug(f"Features: {feature_cols}")

    # Generate predictions
    predictions_df = predict_batch(
        model, scaler, fixtures_df, feature_df, feature_cols
    )

    # Save predictions
    output_path = config.PREDICTIONS_2026_PATH
    output_path.parent.mkdir(parents=True, exist_ok=True)
    predictions_df.to_csv(output_path, index=False)
    logger.info(f"Saved predictions to {output_path}")

    # Log summary
    logger.info(f"Generated predictions for {len(predictions_df)} matches")

    # Count predictions by winner
    if 'predicted_winner' in predictions_df.columns:
        winner_counts = predictions_df['predicted_winner'].value_counts()
        logger.info("Prediction Summary:")
        for team, count in winner_counts.items():
            logger.info(f"  {team}: {count} wins predicted")

    logger.info("=" * 50)
    logger.info("Prediction generation complete")
    logger.info("=" * 50)

    return predictions_df


def generate_report(predictions_df: pd.DataFrame, output_path: Optional[Path] = None) -> None:
    """
    Generate a markdown report summarizing predictions.

    Args:
        predictions_df: DataFrame with predictions
        output_path: Path to save report
    """
    if output_path is None:
        output_path = Path("docs") / "predictions_2026_report.md"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        "# IPL 2026 Match Winner Predictions",
        "",
        f"Total matches: {len(predictions_df)}",
        ""
    ]

    if 'predicted_winner' in predictions_df.columns:
        # Summary by team
        lines.append("## Summary by Team")
        lines.append("")
        winner_counts = predictions_df['predicted_winner'].value_counts()
        lines.append("| Team | Predicted Wins | % |")
        lines.append("|------|----------------|--|")
        for team, count in winner_counts.items():
            pct = (count / len(predictions_df)) * 100
            lines.append(f"| {team} | {count} | {pct:.1f}% |")
        lines.append("")

        # High confidence predictions
        lines.append("## High Confidence Predictions (≥70%)")
        lines.append("")
        high_conf = predictions_df[predictions_df['confidence'] >= 0.70]
        lines.append("| Match | Team 1 | Team 2 | Predicted Winner | Confidence |")
        lines.append("|-|--|--|--|--|")
        for _, row in high_conf.iterrows():
            lines.append(f"| {row['team1']} vs {row['team2']} | {row['team1']} | {row['team2']} | **{row['predicted_winner']}** | {row['confidence']:.1%} |")
        lines.append("")

        # Low confidence predictions
        lines.append("## Close Matches (<30% confidence)")
        lines.append("")
        close = predictions_df[predictions_df['confidence'] < 0.30]
        if len(close) > 0:
            lines.append("| Match | Team 1 | Team 2 | Probabilities (Team1 / Team2) |")
            lines.append("|-|--|--|--|")
            for _, row in close.iterrows():
                lines.append(f"| {row['team1']} vs {row['team2']} | {row['prob_team1']:.1%} / {row['prob_team2']:.1%} |")
            lines.append("")

        # Error cases
        if 'error' in predictions_df.columns:
            errors = predictions_df[predictions_df['error'].notna()]
            if len(errors) > 0:
                lines.append("## Errors")
                lines.append("")
                for _, row in errors.iterrows():
                    lines.append(f"- Match {row['match_id']}: {row['error']}")
                lines.append("")

    # Write report
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    logger.info(f"Generated prediction report at {output_path}")

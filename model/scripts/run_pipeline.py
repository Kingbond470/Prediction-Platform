#!/usr/bin/env python
"""
Main pipeline runner for IPL Match Predictor.
"""
import argparse
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.config import config
from src.utils.logger import get_logger

logger = get_logger("pipeline")


def run_data_collection():
    """Phase 1: Collect data from Kaggle."""
    logger.info("Running data collection phase...")
    from src.data_collection import download_and_validate
    download_and_validate()


def run_preprocessing():
    """Phase 2: Preprocess and feature engineering."""
    logger.info("Running preprocessing phase...")
    from src.preprocessing import clean_and_merge_data
    matches_df, _ = clean_and_merge_data()

    logger.info("Running feature engineering...")
    from src.feature_engineering import build_feature_store
    feature_df = build_feature_store(matches_df)

    logger.info(f"Feature store created with {len(feature_df)} matches and {len(feature_df.columns)} features")
    return feature_df


def run_training():
    """Phase 3: Train models."""
    logger.info("Running training phase...")
    from src.training import train_all_models
    best_model = train_all_models()
    logger.info("Training completed")
    return best_model


def run_prediction():
    """Phase 4: Generate 2026 predictions."""
    logger.info("Running prediction phase...")
    from src.prediction import generate_2026_predictions, generate_report
    predictions = generate_2026_predictions()
    generate_report(predictions)
    logger.info("Prediction phase completed")
    return predictions


def main():
    parser = argparse.ArgumentParser(description="IPL Match Predictor Pipeline")
    parser.add_argument(
        '--phase',
        choices=['all', 'data', 'features', 'train', 'predict'],
        default='all',
        help='Which phase to run (default: all)'
    )
    parser.add_argument(
        '--start-from',
        choices=['data', 'features', 'train', 'predict'],
        help='Start from this phase (implies all subsequent phases)'
    )
    parser.add_argument(
        '--config',
        type=str,
        help='Path to custom config file (YAML)'
    )

    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("IPL Match Predictor Pipeline Started")
    logger.info("=" * 60)

    try:
        # Determine which phases to run
        if args.start_from:
            phases = {
                'data': ['data', 'features', 'train', 'predict'],
                'features': ['features', 'train', 'predict'],
                'train': ['train', 'predict'],
                'predict': ['predict']
            }[args.start_from]
        else:
            phases = {
                'all': ['data', 'features', 'train', 'predict'],
                'data': ['data'],
                'features': ['features'],
                'train': ['train'],
                'predict': ['predict']
            }[args.phase]

        # Run each phase
        for phase in phases:
            if phase == 'data':
                run_data_collection()
            elif phase == 'features':
                run_preprocessing()
            elif phase == 'train':
                run_training()
            elif phase == 'predict':
                run_prediction()

        logger.info("=" * 60)
        logger.info("Pipeline completed successfully!")
        logger.info("=" * 60)

        return 0

    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())

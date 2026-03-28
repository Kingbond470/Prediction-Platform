#!/usr/bin/env python
"""
Standalone script to generate 2026 predictions assuming model is already trained.
"""
import sys
from pathlib import Path
from src.prediction import generate_2026_predictions, generate_report
from src.utils.logger import get_logger

logger = get_logger("predict_2026")


def main():
    try:
        logger.info("Generating 2026 predictions...")
        predictions = generate_2026_predictions()
        generate_report(predictions)
        logger.info("Predictions saved successfully")
        return 0
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())

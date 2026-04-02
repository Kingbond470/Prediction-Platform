"""
Data collection module for IPL Match Predictor.
Handles downloading and organizing IPL datasets from Kaggle.
"""
import logging
from pathlib import Path
from typing import Tuple, Optional
import pandas as pd
import os
import json

# Bootstrap Kaggle credentials from .env BEFORE the kaggle package is imported.
# The kaggle package calls api.authenticate() in its __init__.py at import time,
# so ~/.kaggle/kaggle.json must already exist by then.
from dotenv import load_dotenv as _load_dotenv
_load_dotenv()
_username = os.getenv("KAGGLE_USERNAME", "")
_api_key = os.getenv("KAGGLE_API_KEY", "")
if _username and _api_key:
    _kaggle_dir = Path.home() / ".kaggle"
    _kaggle_dir.mkdir(exist_ok=True)
    _kaggle_json = _kaggle_dir / "kaggle.json"
    if not _kaggle_json.exists():
        with open(_kaggle_json, "w") as _f:
            json.dump({"username": _username, "key": _api_key}, _f)
        os.chmod(_kaggle_json, 0o600)

from kaggle.api.kaggle_api_extended import KaggleApi
from src.config import config
from src.utils.logger import get_logger

logger = get_logger(__name__)


def setup_kaggle_auth() -> KaggleApi:
    """
    Set up Kaggle API authentication using credentials from .env.

    Returns:
        Authenticated KaggleApi instance

    Raises:
        ValueError: If credentials are missing
    """
    if not config.KAGGLE_USERNAME or not config.KAGGLE_API_KEY:
        raise ValueError(
            "Kaggle credentials not found. Please set KAGGLE_USERNAME and "
            "KAGGLE_API_KEY in your .env file. Get your API key from "
            "https://www.kaggle.com/account/api"
        )

    # Set environment variables for Kaggle API
    os.environ['KAGGLE_USERNAME'] = config.KAGGLE_USERNAME
    os.environ['KAGGLE_API_KEY'] = config.KAGGLE_API_KEY

    # Create ~/.kaggle/kaggle.json if it doesn't exist
    kaggle_dir = Path.home() / ".kaggle"
    kaggle_dir.mkdir(exist_ok=True)
    kaggle_json = kaggle_dir / "kaggle.json"
    if not kaggle_json.exists():
        with open(kaggle_json, 'w') as f:
            json.dump({"username": config.KAGGLE_USERNAME, "key": config.KAGGLE_API_KEY}, f)
        os.chmod(kaggle_json, 0o600)
        logger.info(f"Created Kaggle credentials file at {kaggle_json}")

    api = KaggleApi()
    api.authenticate()
    logger.info("Kaggle API authentication successful")
    return api


def download_ipl_datasets(api: KaggleApi, dataset_name: str = None) -> Tuple[Path, Path]:
    """
    Download IPL datasets from Kaggle.

    Args:
        api: Authenticated KaggleApi instance
        dataset_name: Kaggle dataset name (format: username/dataset-name)

    Returns:
        Tuple of (matches_path, deliveries_path)

    Raises:
        Exception: If download fails
    """
    # Resolve dataset name: prefer config.yaml value, fall back to hardcoded default
    if dataset_name is None:
        dataset_name = getattr(config, 'data', {}).get(
            'kaggle_dataset', 'patrickb1912/ipl-complete-dataset-20082020'
        )

    logger.info(f"Downloading IPL dataset from Kaggle: {dataset_name}")

    try:
        # Download all files from the dataset
        api.dataset_download_files(
            dataset=dataset_name,
            path=config.RAW_DATA_DIR,
            unzip=True,
            quiet=False
        )

        logger.info(f"Downloaded dataset to {config.RAW_DATA_DIR}")

        # Look for the expected files
        matches_path = config.RAW_DATA_DIR / "matches.csv"
        deliveries_path = config.RAW_DATA_DIR / "deliveries.csv"

        # If standard names not found, try to identify them
        if not matches_path.exists():
            csv_files = list(config.RAW_DATA_DIR.glob("*.csv"))
            logger.info(f"Available CSV files: {[f.name for f in csv_files]}")

            # Try to find matches file by common naming patterns
            for csv_file in csv_files:
                if "match" in csv_file.name.lower():
                    matches_path = csv_file
                    logger.info(f"Found matches file: {matches_path.name}")
                    break

        if not deliveries_path.exists():
            csv_files = list(config.RAW_DATA_DIR.glob("*.csv"))
            for csv_file in csv_files:
                if "delivery" in csv_file.name.lower() or "ball" in csv_file.name.lower():
                    deliveries_path = csv_file
                    logger.info(f"Found deliveries file: {deliveries_path.name}")
                    break

        # Verify files exist
        if not matches_path.exists():
            raise FileNotFoundError("Could not find matches.csv after download")
        if not deliveries_path.exists():
            logger.warning("Could not find deliveries.csv - some features may be limited")
            deliveries_path = None

        logger.info(f"Matches file: {matches_path}")
        if deliveries_path:
            logger.info(f"Deliveries file: {deliveries_path}")

        return matches_path, deliveries_path if deliveries_path else None

    except Exception as e:
        logger.error(f"Failed to download dataset: {str(e)}")
        raise


def validate_raw_files(matches_path: Path, deliveries_path: Optional[Path] = None) -> bool:
    """
    Validate that raw data files exist and have expected structure.

    Args:
        matches_path: Path to matches CSV
        deliveries_path: Path to deliveries CSV (optional)

    Returns:
        True if validation passes

    Raises:
        ValueError: If validation fails
    """
    logger.info("Validating raw data files...")

    # Check files exist
    if not matches_path.exists():
        raise FileNotFoundError(f"Matches file not found: {matches_path}")
    logger.info("Matches file exists: {}".format(matches_path.name))

    if deliveries_path and not deliveries_path.exists():
        logger.warning(f"Deliveries file not found: {deliveries_path}")

    # Check file contents
    try:
        matches_df = pd.read_csv(matches_path, nrows=5)
        logger.info("Matches file readable. Columns: {}".format(list(matches_df.columns)))

        # Check for essential columns
        required_match_cols = ['season', 'date', 'team1', 'team2', 'winner']
        missing_cols = [col for col in required_match_cols if col not in matches_df.columns]
        if missing_cols:
            logger.warning(f"Missing expected columns in matches.csv: {missing_cols}")
        else:
            logger.info("Matches file has expected columns")

    except Exception as e:
        raise ValueError(f"Failed to read matches file: {str(e)}")

    if deliveries_path and deliveries_path.exists():
        try:
            deliveries_df = pd.read_csv(deliveries_path, nrows=5)
            logger.info("Deliveries file readable. Columns: {}".format(list(deliveries_df.columns)))
        except Exception as e:
            logger.warning(f"Failed to read deliveries file: {str(e)}")

    logger.info("Validation complete")
    return True


def organize_raw_data() -> None:
    """
    Organize raw data files in standard directory structure.
    This function can be extended to handle file renaming, etc.
    """
    logger.info("Organizing raw data files...")
    # Currently files are downloaded directly to data/raw/
    # Can add logic here for renaming or moving files if needed
    logger.info("Raw data organization complete")


def download_and_validate() -> Tuple[Path, Optional[Path]]:
    """
    Complete data collection pipeline:
    1. Authenticate with Kaggle
    2. Download datasets
    3. Validate files
    4. Organize

    Returns:
        Tuple of (matches_path, deliveries_path)
    """
    logger.info("=" * 50)
    logger.info("Starting data collection process")
    logger.info("=" * 50)

    # Check if files already exist
    matches_path = config.RAW_MATCHES_PATH
    deliveries_path = config.RAW_DELIVERIES_PATH

    if matches_path.exists():
        logger.info(f"Matches file already exists at {matches_path}")
        if deliveries_path.exists():
            logger.info(f"Deliveries file already exists at {deliveries_path}")
            # Validate existing files
            validate_raw_files(matches_path, deliveries_path)
            organize_raw_data()
            logger.info("=" * 50)
            logger.info("Data collection skipped - files already exist")
            logger.info("=" * 50)
            return matches_path, deliveries_path
        else:
            logger.warning(f"Matches file exists but deliveries file missing at {deliveries_path}")
    else:
        logger.info("Raw data files not found, proceeding with download")

    try:
        # Step 1: Authenticate
        api = setup_kaggle_auth()

        # Step 2: Download
        matches_path, deliveries_path = download_ipl_datasets(api)

        # Step 3: Validate
        validate_raw_files(matches_path, deliveries_path)

        # Step 4: Organize
        organize_raw_data()

        logger.info("=" * 50)
        logger.info("Data collection completed successfully")
        logger.info("=" * 50)

        return matches_path, deliveries_path

    except Exception as e:
        logger.error(f"Data collection failed: {str(e)}")
        raise


if __name__ == "__main__":
    # Allow running as script for testing
    try:
        matches_path, deliveries_path = download_and_validate()
        print(f"Data collected successfully:")
        print(f"  Matches: {matches_path}")
        if deliveries_path:
            print(f"  Deliveries: {deliveries_path}")
    except Exception as e:
        print(f"Error: {e}")
        exit(1)

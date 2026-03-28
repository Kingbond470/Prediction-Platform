"""
Configuration management for IPL Match Predictor.
"""
from dataclasses import dataclass, field
from pathlib import Path
import os
import yaml
import logging
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Basic logger for config module
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class Config:
    """Central configuration for the project."""

    # Project paths
    BASE_DIR: Path = field(default_factory=lambda: Path.cwd())
    DATA_DIR: Path = field(default_factory=lambda: Path.cwd() / "data")
    RAW_DATA_DIR: Path = field(default_factory=lambda: Path.cwd() / "data" / "raw")
    PROCESSED_DATA_DIR: Path = field(default_factory=lambda: Path.cwd() / "data" / "processed")
    EXTERNAL_DATA_DIR: Path = field(default_factory=lambda: Path.cwd() / "data" / "external")
    MODELS_DIR: Path = field(default_factory=lambda: Path.cwd() / "models" / "trained")
    SCALERS_DIR: Path = field(default_factory=lambda: Path.cwd() / "models" / "scalers")
    LOGS_DIR: Path = field(default_factory=lambda: Path.cwd() / "logs")
    CONFIG_DIR: Path = field(default_factory=lambda: Path.cwd() / "config")
    NOTEBOOKS_DIR: Path = field(default_factory=lambda: Path.cwd() / "notebooks")
    SRC_DIR: Path = field(default_factory=lambda: Path.cwd() / "src")

    # API credentials
    KAGGLE_USERNAME: str = os.getenv("KAGGLE_USERNAME", "")
    KAGGLE_API_KEY: str = os.getenv("KAGGLE_API_KEY", "")

    # Random seed for reproducibility
    RANDOM_STATE: int = int(os.getenv("RANDOM_STATE", "42"))

    # Data file paths
    RAW_MATCHES_PATH: Path = field(default_factory=lambda: Path.cwd() / "data" / "raw" / "matches.csv")
    RAW_DELIVERIES_PATH: Path = field(default_factory=lambda: Path.cwd() / "data" / "raw" / "deliveries.csv")
    CLEANED_MATCHES_PATH: Path = field(default_factory=lambda: Path.cwd() / "data" / "processed" / "cleaned_matches.csv")
    CLEANED_DELIVERIES_PATH: Path = field(default_factory=lambda: Path.cwd() / "data" / "processed" / "cleaned_deliveries.csv")
    FEATURE_MATRIX_PATH: Path = field(default_factory=lambda: Path.cwd() / "data" / "processed" / "feature_matrix.csv")
    PREDICTIONS_2026_PATH: Path = field(default_factory=lambda: Path.cwd() / "data" / "processed" / "predictions_2026.csv")
    IPL_2026_FIXTURES_PATH: Path = field(default_factory=lambda: Path.cwd() / "data" / "external" / "ipl_2026_fixtures.csv")

    # Model paths
    BEST_MODEL_PATH: Path = field(default_factory=lambda: Path.cwd() / "models" / "trained" / "best_model.pkl")
    SCALER_PATH: Path = field(default_factory=lambda: Path.cwd() / "models" / "scalers" / "scaler.pkl")

    # Config file paths
    TEAM_MAPPING_PATH: Path = field(default_factory=lambda: Path.cwd() / "config" / "team_mapping.json")
    MAIN_CONFIG_PATH: Path = field(default_factory=lambda: Path.cwd() / "config" / "config.yaml")

    def __post_init__(self):
        """Create directories if they don't exist and load YAML config."""
        for dir_path in [
            self.DATA_DIR,
            self.RAW_DATA_DIR,
            self.PROCESSED_DATA_DIR,
            self.EXTERNAL_DATA_DIR,
            self.MODELS_DIR,
            self.SCALERS_DIR,
            self.LOGS_DIR,
            self.CONFIG_DIR,
            self.SRC_DIR,
        ]:
            dir_path.mkdir(parents=True, exist_ok=True)

        # Load YAML configuration and set as attributes
        self._load_yaml_config()

    def _load_yaml_config(self):
        """Load configuration from YAML file and set as attributes."""
        try:
            yaml_path = self.MAIN_CONFIG_PATH
            if yaml_path.exists():
                with open(yaml_path, 'r') as f:
                    yaml_config = yaml.safe_load(f)

                # Flatten YAML config into attributes
                # e.g., config['feature_engineering']['form_window'] becomes self.feature_engineering['form_window']
                # but we'll make them accessible via dot notation by storing nested dicts as attributes
                for top_key, value in yaml_config.items():
                    setattr(self, top_key, value)

                logger.info(f"Loaded configuration from {yaml_path}")
            else:
                logger.warning(f"YAML config not found at {self.MAIN_CONFIG_PATH}. Using defaults.")
                # Set default configs
                self.feature_engineering = {
                    'form_window': 5,
                    'h2h_window': 10,
                    'venue_window': 10
                }
                self.training = {'cv_folds': 5}
        except Exception as e:
            logger.error(f"Failed to load YAML config: {e}")
            # Set minimal defaults
            self.feature_engineering = {'form_window': 5, 'h2h_window': 10, 'venue_window': 10}
            self.training = {'cv_folds': 5}

    def get_data_raw_path(self) -> Path:
        return self.RAW_DATA_DIR

    def get_data_processed_path(self) -> Path:
        return self.PROCESSED_DATA_DIR

    def get_models_path(self) -> Path:
        return self.MODELS_DIR

    def get_scalers_path(self) -> Path:
        return self.SCALERS_DIR


# Create a global config instance
config = Config()

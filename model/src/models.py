"""
Machine learning models for IPL Match Predictor.
Defines model wrappers with unified interface.
"""
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except Exception:
    xgb = None
    XGBOOST_AVAILABLE = False

from src.config import config
from src.utils.logger import get_logger

logger = get_logger(__name__)


class BaseModel(ABC):
    """Abstract base class for all models."""

    @abstractmethod
    def train(self, X_train: pd.DataFrame, y_train: pd.Series) -> None:
        """Train the model on training data."""
        pass

    @abstractmethod
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Return class predictions."""
        pass

    @abstractmethod
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Return probability predictions (n_samples, 2)."""
        pass

    @abstractmethod
    def save(self, path: Path) -> None:
        """Save model to disk."""
        pass

    @abstractmethod
    def load(self, path: Path) -> None:
        """Load model from disk."""
        pass

    def get_feature_importance(self) -> Optional[np.ndarray]:
        """
        Get feature importance if available.
        Returns None if model doesn't support it.
        """
        return None


class LogisticRegressionModel(BaseModel):
    """Logistic Regression model wrapper."""

    def __init__(
        self,
        C: float = 1.0,
        penalty: str = 'l2',
        class_weight: str = 'balanced',
        random_state: int = None,
        max_iter: int = 1000,
        solver: str = 'lbfgs'
    ):
        self.C = C
        self.penalty = penalty
        self.class_weight = class_weight
        self.random_state = random_state or config.RANDOM_STATE
        self.max_iter = max_iter
        self.solver = solver

        self.model = LogisticRegression(
            C=self.C,
            penalty=self.penalty,
            class_weight=self.class_weight,
            random_state=self.random_state,
            max_iter=self.max_iter,
            solver=self.solver,
            n_jobs=-1 if self.solver in ['lbfgs', 'newton-cg'] else None
        )
        self.is_fitted = False

    def train(self, X_train: pd.DataFrame, y_train: pd.Series) -> None:
        """Train logistic regression model."""
        logger.info(f"Training LogisticRegression (C={self.C})...")
        self.model.fit(X_train, y_train)
        self.is_fitted = True
        logger.info("Training complete")

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Return binary predictions."""
        if not self.is_fitted:
            raise RuntimeError("Model must be trained or loaded before prediction")
        if isinstance(X, pd.DataFrame):
            X = X.values
        return self.model.predict(X)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Return probability predictions."""
        if not self.is_fitted:
            raise RuntimeError("Model must be trained or loaded before prediction")
        if isinstance(X, pd.DataFrame):
            X = X.values
        return self.model.predict_proba(X)

    def save(self, path: Path) -> None:
        """Save model using joblib."""
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path)
        logger.info(f"Saved LogisticRegression model to {path}")

    def load(self, path: Path) -> None:
        """Load model from joblib file."""
        self.model = joblib.load(path)
        self.is_fitted = True
        logger.info(f"Loaded LogisticRegression model from {path}")

    def get_feature_importance(self) -> Optional[np.ndarray]:
        """Return coefficients as feature importance."""
        if hasattr(self.model, 'coef_'):
            return np.abs(self.model.coef_[0])
        return None

    def get_params(self) -> Dict[str, Any]:
        """Get model parameters."""
        return {
            'C': self.C,
            'penalty': self.penalty,
            'class_weight': self.class_weight
        }


class RandomForestModel(BaseModel):
    """Random Forest model wrapper."""

    def __init__(
        self,
        n_estimators: int = 200,
        max_depth: int = 10,
        min_samples_split: int = 5,
        min_samples_leaf: int = 2,
        class_weight: str = 'balanced',
        random_state: int = None,
        n_jobs: int = -1
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.class_weight = class_weight
        self.random_state = random_state or config.RANDOM_STATE
        self.n_jobs = n_jobs

        self.model = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_split=self.min_samples_split,
            min_samples_leaf=self.min_samples_leaf,
            class_weight=self.class_weight,
            random_state=self.random_state,
            n_jobs=self.n_jobs
        )
        self.is_fitted = False

    def train(self, X_train: pd.DataFrame, y_train: pd.Series) -> None:
        """Train random forest model."""
        logger.info(f"Training RandomForest (n_estimators={self.n_estimators}, max_depth={self.max_depth})...")
        self.model.fit(X_train, y_train)
        self.is_fitted = True
        logger.info("Training complete")

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Return binary predictions."""
        if not self.is_fitted:
            raise RuntimeError("Model must be trained or loaded before prediction")
        if isinstance(X, pd.DataFrame):
            X = X.values
        return self.model.predict(X)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Return probability predictions."""
        if not self.is_fitted:
            raise RuntimeError("Model must be trained or loaded before prediction")
        if isinstance(X, pd.DataFrame):
            X = X.values
        return self.model.predict_proba(X)

    def save(self, path: Path) -> None:
        """Save model using joblib."""
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path)
        logger.info(f"Saved RandomForest model to {path}")

    def load(self, path: Path) -> None:
        """Load model from joblib file."""
        self.model = joblib.load(path)
        self.is_fitted = True
        logger.info(f"Loaded RandomForest model from {path}")

    def get_feature_importance(self) -> Optional[np.ndarray]:
        """Return feature importances."""
        if hasattr(self.model, 'feature_importances_'):
            return self.model.feature_importances_
        return None

    def get_params(self) -> Dict[str, Any]:
        """Get model parameters."""
        return {
            'n_estimators': self.n_estimators,
            'max_depth': self.max_depth,
            'min_samples_split': self.min_samples_split,
            'min_samples_leaf': self.min_samples_leaf
        }


class XGBoostModel(BaseModel):
    """XGBoost model wrapper. Requires libomp on macOS (brew install libomp)."""

    def __init__(
        self,
        n_estimators: int = 300,
        learning_rate: float = 0.05,
        max_depth: int = 6,
        subsample: float = 0.8,
        colsample_bytree: float = 0.8,
        use_label_encoder: bool = False,
        eval_metric: str = 'logloss',
        random_state: int = None,
        n_jobs: int = -1
    ):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.subsample = subsample
        self.colsample_bytree = colsample_bytree
        self.use_label_encoder = use_label_encoder
        self.eval_metric = eval_metric
        self.random_state = random_state or config.RANDOM_STATE
        self.n_jobs = n_jobs

        if not XGBOOST_AVAILABLE:
            raise ImportError(
                "XGBoost is not available. On macOS run: brew install libomp"
            )
        self.model = xgb.XGBClassifier(
            n_estimators=self.n_estimators,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            subsample=self.subsample,
            colsample_bytree=self.colsample_bytree,
            use_label_encoder=self.use_label_encoder,
            eval_metric=self.eval_metric,
            random_state=self.random_state,
            n_jobs=self.n_jobs
        )
        self.is_fitted = False

    def train(self, X_train: pd.DataFrame, y_train: pd.Series) -> None:
        """Train XGBoost model."""
        logger.info(f"Training XGBoost (n_estimators={self.n_estimators}, lr={self.learning_rate})...")
        # Convert to numpy arrays to avoid DataFrame issues with some XGBoost versions
        if isinstance(X_train, pd.DataFrame):
            X_train = X_train.values
        if isinstance(y_train, pd.Series):
            y_train = y_train.values
        self.model.fit(X_train, y_train)
        self.is_fitted = True
        logger.info("Training complete")

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Return binary predictions."""
        if not self.is_fitted:
            raise RuntimeError("Model must be trained or loaded before prediction")
        if isinstance(X, pd.DataFrame):
            X = X.values
        return self.model.predict(X)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Return probability predictions."""
        if not self.is_fitted:
            raise RuntimeError("Model must be trained or loaded before prediction")
        if isinstance(X, pd.DataFrame):
            X = X.values
        return self.model.predict_proba(X)

    def save(self, path: Path) -> None:
        """Save model using joblib."""
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path)
        logger.info(f"Saved XGBoost model to {path}")

    def load(self, path: Path) -> None:
        """Load model from joblib file."""
        self.model = joblib.load(path)
        self.is_fitted = True
        logger.info(f"Loaded XGBoost model from {path}")

    def get_feature_importance(self) -> Optional[np.ndarray]:
        """Return feature importances."""
        if hasattr(self.model, 'feature_importances_'):
            return self.model.feature_importances_
        return None

    def get_params(self) -> Dict[str, Any]:
        """Get model parameters."""
        return {
            'n_estimators': self.n_estimators,
            'learning_rate': self.learning_rate,
            'max_depth': self.max_depth,
            'subsample': self.subsample,
            'colsample_bytree': self.colsample_bytree
        }


def create_model(model_type: str, **kwargs) -> BaseModel:
    """
    Factory function to create model instances.

    Args:
        model_type: Type of model ('logistic', 'random_forest', 'xgboost')
        **kwargs: Model-specific hyperparameters

    Returns:
        Model instance
    """
    model_map = {
        'logistic': LogisticRegressionModel,
        'random_forest': RandomForestModel,
        'xgboost': XGBoostModel
    }

    if model_type not in model_map:
        raise ValueError(f"Unknown model type: {model_type}. Choose from {list(model_map.keys())}")

    if model_type == 'xgboost' and not XGBOOST_AVAILABLE:
        logger.warning("XGBoost unavailable (missing libomp on macOS). Falling back to random_forest.")
        model_type = 'random_forest'

    return model_map[model_type](**kwargs)

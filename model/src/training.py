"""
Training pipeline for IPL Match Predictor.
Handles data preparation, cross-validation, and model training.
"""
import logging
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, precision_score, recall_score
from src.config import config
from src.utils.logger import get_logger
from src.models import BaseModel, create_model

logger = get_logger(__name__)


def prepare_training_data(
    feature_df: pd.DataFrame,
    feature_cols: list,
    target_col: str = 'winner_encoded'
) -> Tuple[pd.DataFrame, pd.Series, StandardScaler]:
    """
    Prepare feature matrix X and target y for training.
    Scales numerical features and returns scaler for later use.

    Args:
        feature_df: Feature matrix DataFrame
        feature_cols: List of feature column names to use
        target_col: Target column name

    Returns:
        Tuple of (X_scaled, y, scaler)
    """
    logger.info("Preparing training data...")

    # Extract features and target
    X = feature_df[feature_cols].copy()
    y = feature_df[target_col].copy()

    # Scale numerical features (assuming all are numeric for simplicity)
    scaler = StandardScaler()
    X_scaled = pd.DataFrame(
        scaler.fit_transform(X),
        columns=X.columns,
        index=X.index
    )

    # Save scaler
    scaler_path = config.SCALER_PATH
    scaler_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(scaler, scaler_path)
    logger.info(f"Saved scaler to {scaler_path}")

    logger.info(f"Training data prepared: {X_scaled.shape[0]} samples, {X_scaled.shape[1]} features")
    return X_scaled, y, scaler


def temporal_split(
    feature_df: pd.DataFrame,
    train_cutoff: str = "2020-12-31",
    val_cutoff: str = "2023-12-31",
    date_col: str = 'date'
) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
    """
    Split data by time to prevent data leakage.

    Args:
        feature_df: Feature DataFrame with date column
        train_cutoff: Last date for training set (inclusive)
        val_cutoff: Last date for validation set (inclusive)
        date_col: Name of date column

    Returns:
        (X_train, y_train, X_val, y_val, X_test, y_test)
    """
    logger.info("Performing temporal split...")
    logger.info(f"Train cutoff: {train_cutoff}, Val cutoff: {val_cutoff}")

    # Convert cutoff strings to timestamps
    train_cutoff_dt = pd.to_datetime(train_cutoff)
    val_cutoff_dt = pd.to_datetime(val_cutoff)

    # Split by date
    train_df = feature_df[feature_df[date_col] <= train_cutoff_dt].copy()
    val_df = feature_df[(feature_df[date_col] > train_cutoff_dt) &
                        (feature_df[date_col] <= val_cutoff_dt)].copy()
    test_df = feature_df[feature_df[date_col] > val_cutoff_dt].copy()

    logger.info(f"Train: {len(train_df)} matches")
    logger.info(f"Validation: {len(val_df)} matches")
    logger.info(f"Test: {len(test_df)} matches")

    return train_df, val_df, test_df


def cross_validate_model(
    model: BaseModel,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    cv_folds: int = 5
) -> Dict[str, Dict[str, float]]:
    """
    Perform stratified k-fold cross-validation.

    Args:
        model: Model instance to validate
        X_train: Training features
        y_train: Training target
        cv_folds: Number of folds

    Returns:
        Dictionary with mean and std of metrics for each fold
    """
    logger.info(f"Starting {cv_folds}-fold cross-validation...")

    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=config.RANDOM_STATE)

    fold_metrics = {
        'accuracy': [],
        'roc_auc': [],
        'f1': [],
        'precision': [],
        'recall': []
    }

    for fold, (train_idx, val_idx) in enumerate(cv.split(X_train, y_train), 1):
        logger.info(f"  Fold {fold}/{cv_folds}...")

        X_train_fold = X_train.iloc[train_idx]
        y_train_fold = y_train.iloc[train_idx]
        X_val_fold = X_train.iloc[val_idx]
        y_val_fold = y_train.iloc[val_idx]

        # Train model
        model.train(X_train_fold, y_train_fold)

        # Predict
        y_pred = model.predict(X_val_fold)
        y_proba = model.predict_proba(X_val_fold)[:, 1]

        # Calculate metrics
        fold_metrics['accuracy'].append(accuracy_score(y_val_fold, y_pred))
        fold_metrics['roc_auc'].append(roc_auc_score(y_val_fold, y_proba))
        fold_metrics['f1'].append(f1_score(y_val_fold, y_pred))
        fold_metrics['precision'].append(precision_score(y_val_fold, y_pred))
        fold_metrics['recall'].append(recall_score(y_val_fold, y_pred))

    # Aggregate results
    results = {}
    for metric, scores in fold_metrics.items():
        results[metric] = {
            'mean': float(np.mean(scores)),
            'std': float(np.std(scores))
        }
        logger.info(f"  CV {metric}: {results[metric]['mean']:.4f} ± {results[metric]['std']:.4f}")

    return results


def train_model(
    model: BaseModel,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_val: pd.DataFrame = None,
    y_val: pd.Series = None,
    save_path: Optional[Path] = None
) -> Dict[str, float]:
    """
    Train a single model and evaluate on training set.

    Args:
        model: Model instance
        X_train: Training features
        y_train: Training target
        X_val: Validation features (optional, for logging)
        y_val: Validation target (optional)
        save_path: Path to save trained model

    Returns:
        Dictionary with training metrics
    """
    logger.info("Training model...")
    model.train(X_train, y_train)

    # Evaluate on training set
    y_pred = model.predict(X_train)
    y_proba = model.predict_proba(X_train)[:, 1]

    metrics = {
        'train_accuracy': accuracy_score(y_train, y_pred),
        'train_roc_auc': roc_auc_score(y_train, y_proba),
        'train_f1': f1_score(y_train, y_pred)
    }

    logger.info(f"Training accuracy: {metrics['train_accuracy']:.4f}")
    logger.info(f"Training ROC-AUC: {metrics['train_roc_auc']:.4f}")
    logger.info(f"Training F1: {metrics['train_f1']:.4f}")

    # Evaluate on validation set if provided
    if X_val is not None and y_val is not None:
        y_pred_val = model.predict(X_val)
        y_proba_val = model.predict_proba(X_val)[:, 1]

        metrics['val_accuracy'] = accuracy_score(y_val, y_pred_val)
        metrics['val_roc_auc'] = roc_auc_score(y_val, y_proba_val)
        metrics['val_f1'] = f1_score(y_val, y_pred_val)

        logger.info(f"Validation accuracy: {metrics['val_accuracy']:.4f}")
        logger.info(f"Validation ROC-AUC: {metrics['val_roc_auc']:.4f}")
        logger.info(f"Validation F1: {metrics['val_f1']:.4f}")

    # Save model if path provided
    if save_path:
        model.save(save_path)

    return metrics


def evaluate_model(
    model: BaseModel,
    X_test: pd.DataFrame,
    y_test: pd.Series
) -> Dict[str, float]:
    """
    Evaluate model on test set.

    Args:
        model: Trained model
        X_test: Test features
        y_test: Test target

    Returns:
        Dictionary with test metrics
    """
    logger.info("Evaluating model on test set...")

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    metrics = {
        'test_accuracy': accuracy_score(y_test, y_pred),
        'test_roc_auc': roc_auc_score(y_test, y_proba),
        'test_f1': f1_score(y_test, y_pred),
        'test_precision': precision_score(y_test, y_pred),
        'test_recall': recall_score(y_test, y_pred)
    }

    for key, value in metrics.items():
        logger.info(f"{key}: {value:.4f}")

    return metrics


def train_models(
    feature_df: pd.DataFrame,
    feature_cols: list,
    model_configs: Optional[Dict[str, Dict[str, Any]]] = None,
    use_cv: bool = True
) -> Tuple[BaseModel, Dict[str, Any]]:
    """
    Train multiple models and select the best one.

    Args:
        feature_df: Full feature DataFrame
        feature_cols: List of feature columns to use
        model_configs: Dictionary mapping model names to their kwargs
                      Example: {'logistic': {'C': 1.0}, 'xgboost': {'n_estimators': 200}}
        use_cv: Whether to use cross-validation

    Returns:
        (best_model, results_dict)
    """
    logger.info("=" * 50)
    logger.info("Starting model training")
    logger.info("=" * 50)

    # Temporally split data
    train_df, val_df, test_df = temporal_split(
        feature_df,
        train_cutoff=config.features.get('train_cutoff', '2020-12-31'),
        val_cutoff=config.features.get('val_cutoff', '2023-12-31')
    )

    # Prepare training data
    X_train, y_train, scaler = prepare_training_data(train_df, feature_cols)
    X_val, y_val = val_df[feature_cols], val_df['winner_encoded']
    X_test, y_test = test_df[feature_cols], test_df['winner_encoded']

    # Scale validation and test sets
    X_val_scaled = pd.DataFrame(scaler.transform(X_val), columns=X_val.columns, index=X_val.index)
    X_test_scaled = pd.DataFrame(scaler.transform(X_test), columns=X_test.columns, index=X_test.index)

    # Default model configs if not provided
    if model_configs is None:
        model_configs = {
            'logistic': {},
            'random_forest': {},
            'xgboost': {}
        }

    results = {}
    best_model = None
    best_score = 0

    # Train each model
    for model_name, model_kwargs in model_configs.items():
        logger.info(f"\n{'='*20} Training {model_name} {'='*20}")

        try:
            # Create model
            model = create_model(model_name, **model_kwargs)

            # Cross-validation if requested
            if use_cv and len(X_train) > 100:  # Only CV if enough data
                cv_results = cross_validate_model(model, X_train, y_train, cv_folds=config.training.get('cv_folds', 5))
                results[model_name] = {'cv': cv_results}
            else:
                logger.info("Skipping CV (not enough data or disabled)")

            # Train on full training set and evaluate on validation
            train_metrics = train_model(
                model, X_train, y_train,
                X_val=X_val_scaled, y_val=y_val
            )

            results[model_name]['train'] = train_metrics

            # Evaluate on test set
            test_metrics = evaluate_model(model, X_test_scaled, y_test)
            results[model_name]['test'] = test_metrics

            # Track best model by validation ROC-AUC or test accuracy
            val_roc_auc = train_metrics.get('val_roc_auc', 0)
            if val_roc_auc > best_score:
                best_score = val_roc_auc
                best_model = model
                logger.info(f"New best model: {model_name} (val ROC-AUC: {val_roc_auc:.4f})")

        except Exception as e:
            logger.error(f"Error training {model_name}: {e}")
            import traceback
            traceback.print_exc()
            continue

    # Save best model
    if best_model is not None:
        best_model_path = config.BEST_MODEL_PATH
        best_model.save(best_model_path)
        logger.info(f"\nBest model saved to {best_model_path}")

        # Save results
        results_path = config.PROCESSED_DATA_DIR / "training_results.json"
        import json
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Training results saved to {results_path}")

    logger.info("=" * 50)
    logger.info("Training completed")
    logger.info("=" * 50)

    return best_model, results


def train_all_models(
    feature_matrix_path: Optional[Path] = None,
    feature_cols: Optional[list] = None
) -> BaseModel:
    """
    Convenience function to train all models from feature matrix file.

    Args:
        feature_matrix_path: Path to feature matrix CSV
        feature_cols: List of feature columns to use

    Returns:
        Best trained model
    """
    if feature_matrix_path is None:
        feature_matrix_path = config.FEATURE_MATRIX_PATH

    logger.info(f"Loading feature matrix from {feature_matrix_path}")
    feature_df = pd.read_csv(feature_matrix_path)

    # Convert date column to datetime
    feature_df['date'] = pd.to_datetime(feature_df['date'])

    # Determine feature columns if not provided
    if feature_cols is None:
        config_yaml_path = config.MAIN_CONFIG_PATH
        import yaml
        with open(config_yaml_path, 'r') as f:
            cfg = yaml.safe_load(f)
        feature_cols = cfg['features']['numerical_columns'] + \
                       [col + '_encoded' for col in cfg['features']['categorical_columns']]
        # Add derived features
        feature_cols.extend(['form_diff', 'venue_form_diff', 'h2h_win_pct_diff'])

    # Filter out columns with all NaN
    feature_cols = [col for col in feature_cols if col in feature_df.columns]

    logger.info(f"Using features: {feature_cols}")

    # Train models
    best_model, results = train_models(feature_df, feature_cols, use_cv=True)

    return best_model

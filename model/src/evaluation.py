"""
Model evaluation module for IPL Match Predictor.
Provides comprehensive metrics and visualization functions.
"""
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    roc_auc_score,
    f1_score,
    precision_score,
    recall_score,
    confusion_matrix,
    classification_report,
    roc_curve,
    auc
)
from src.config import config
from src.utils.logger import get_logger

logger = get_logger(__name__)

# Set style
plt.style.use('default')
sns.set_palette("husl")


def calculate_metrics(
    y_true: pd.Series,
    y_pred: np.ndarray,
    y_proba: np.ndarray
) -> Dict[str, float]:
    """
    Calculate comprehensive evaluation metrics.

    Args:
        y_true: True labels
        y_pred: Predicted labels
        y_proba: Predicted probabilities for positive class (or 2D array)

    Returns:
        Dictionary of metric names and values
    """
    if y_proba.ndim > 1:
        y_proba = y_proba[:, 1]  # Take positive class probability

    metrics = {
        'accuracy': accuracy_score(y_true, y_pred),
        'precision': precision_score(y_true, y_pred, zero_division=0),
        'recall': recall_score(y_true, y_pred, zero_division=0),
        'f1': f1_score(y_true, y_pred, zero_division=0),
        'roc_auc': roc_auc_score(y_true, y_proba)
    }

    return metrics


def plot_confusion_matrix(
    y_true: pd.Series,
    y_pred: np.ndarray,
    save_path: Optional[Path] = None,
    title: str = "Confusion Matrix"
) -> plt.Figure:
    """
    Plot confusion matrix heatmap.

    Args:
        y_true: True labels
        y_pred: Predicted labels
        save_path: Path to save the plot
        title: Plot title

    Returns:
        Matplotlib Figure object
    """
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))

    sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='Blues',
        ax=ax,
        cbar=True,
        square=True
    )

    ax.set_xlabel('Predicted', fontsize=12)
    ax.set_ylabel('Actual', fontsize=12)
    ax.set_title(title, fontsize=14, fontweight='bold')

    ax.set_xticklabels(['Team 1', 'Team 2'])
    ax.set_yticklabels(['Team 1', 'Team 2'])

    plt.tight_layout()

    if save_path:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        logger.info(f"Saved confusion matrix to {save_path}")

    return fig


def plot_roc_curve(
    y_true: pd.Series,
    y_proba: np.ndarray,
    save_path: Optional[Path] = None,
    title: str = "ROC Curve"
) -> plt.Figure:
    """
    Plot ROC curve.

    Args:
        y_true: True labels
        y_proba: Predicted probabilities for positive class
        save_path: Path to save the plot
        title: Plot title

    Returns:
        Matplotlib Figure object
    """
    if y_proba.ndim > 1:
        y_proba = y_proba[:, 1]

    fpr, tpr, _ = roc_curve(y_true, y_proba)
    roc_auc = auc(fpr, tpr)

    fig, ax = plt.subplots(figsize=(6, 5))

    ax.plot(fpr, tpr, color='steelblue', lw=2, label=f'ROC curve (AUC = {roc_auc:.3f})')
    ax.plot([0, 1], [0, 1], color='red', lw=1, linestyle='--', alpha=0.7, label='Random Classifier')

    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel('False Positive Rate', fontsize=12)
    ax.set_ylabel('True Positive Rate', fontsize=12)
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.legend(loc="lower right", fontsize=10)

    plt.tight_layout()

    if save_path:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        logger.info(f"Saved ROC curve to {save_path}")

    return fig


def plot_feature_importance(
    model: Any,
    feature_names: list,
    top_n: int = 20,
    save_path: Optional[Path] = None,
    title: str = "Feature Importance"
) -> Optional[plt.Figure]:
    """
    Plot feature importance bar chart.

    Args:
        model: Trained model with feature_importances_ or coef_ attribute
        feature_names: List of feature names corresponding to columns
        top_n: Number of top features to show
        save_path: Path to save the plot
        title: Plot title

    Returns:
        Matplotlib Figure object or None if feature importance not available
    """
    importances = None

    # Try to get feature importance
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
    elif hasattr(model, 'coef_'):
        importances = np.abs(model.coef_[0])
    else:
        logger.warning("Model does not support feature importance")
        return None

    # Sort
    indices = np.argsort(importances)[::-1]
    top_indices = indices[:top_n]

    top_features = [feature_names[i] for i in top_indices]
    top_importances = importances[top_indices]

    # Plot
    fig, ax = plt.subplots(figsize=(8, max(4, top_n * 0.3)))

    y_pos = np.arange(len(top_features))
    ax.barh(y_pos, top_importances[::-1])
    ax.set_yticks(y_pos)
    ax.set_yticklabels(top_features[::-1])
    ax.invert_yaxis()
    ax.set_xlabel('Importance', fontsize=12)
    ax.set_title(title, fontsize=14, fontweight='bold')

    plt.tight_layout()

    if save_path:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        logger.info(f"Saved feature importance plot to {save_path}")

    return fig


def plot_calibration_curve(
    y_true: pd.Series,
    y_proba: np.ndarray,
    n_bins: int = 10,
    save_path: Optional[Path] = None,
    title: str = "Calibration Curve"
) -> plt.Figure:
    """
    Plot calibration curve (reliability diagram).

    Args:
        y_true: True labels
        y_proba: Predicted probabilities
        n_bins: Number of bins for calibration
        save_path: Path to save plot
        title: Plot title

    Returns:
        Matplotlib Figure object
    """
    if y_proba.ndim > 1:
        y_proba = y_proba[:, 1]

    # Bin predictions
    bins = np.linspace(0, 1, n_bins + 1)
    binids = np.digitize(y_proba, bins) - 1
    binids = np.clip(binids, 0, n_bins - 1)

    bin_sums = np.bincount(binids, weights=y_proba, minlength=n_bins)
    bin_true = np.bincount(binids, weights=y_true, minlength=n_bins)
    bin_count = np.bincount(binids, minlength=n_bins)

    nonzero = bin_count != 0
    prob_pred = bin_sums[nonzero] / bin_count[nonzero]
    prob_true = bin_true[nonzero] / bin_count[nonzero]

    fig, ax = plt.subplots(figsize=(6, 5))

    ax.plot([0, 1], [0, 1], 'k:', label='Perfectly calibrated')
    ax.scatter(prob_pred, prob_true, s=100, alpha=0.8, label='Model')

    ax.set_xlim([-0.05, 1.05])
    ax.set_ylim([-0.05, 1.05])
    ax.set_xlabel('Predicted Probability', fontsize=12)
    ax.set_ylabel('True Frequency', fontsize=12)
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.legend(loc='upper left')

    plt.tight_layout()

    if save_path:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        logger.info(f"Saved calibration curve to {save_path}")

    return fig


def generate_classification_report_text(
    y_true: pd.Series,
    y_pred: np.ndarray,
    target_names: list = None
) -> str:
    """
    Generate classification report as string.

    Args:
        y_true: True labels
        y_pred: Predicted labels
        target_names: Names for target classes

    Returns:
        Formatted classification report string
    """
    if target_names is None:
        target_names = ['Team1 Wins', 'Team2 Wins']

    return classification_report(y_true, y_pred, target_names=target_names, digits=4)


def evaluate_and_plot(
    model: Any,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    feature_names: list,
    output_dir: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Complete evaluation with plots.

    Args:
        model: Trained model
        X_test: Test features
        y_test: Test labels
        feature_names: Feature column names
        output_dir: Directory to save plots

    Returns:
        Dictionary with all metrics
    """
    logger.info("Running complete evaluation...")

    if output_dir is None:
        output_dir = config.MODELS_DIR / "evaluation"

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Get predictions
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    # Calculate metrics
    metrics = calculate_metrics(y_test, y_pred, y_proba)

    # Log metrics
    logger.info("=== Test Set Metrics ===")
    for key, value in metrics.items():
        logger.info(f"{key}: {value:.4f}")

    # Generate report
    report = generate_classification_report_text(y_test, y_pred)
    logger.info("\n" + report)

    # Plots
    figures = {}

    # Confusion matrix
    cm_fig = plot_confusion_matrix(
        y_test, y_pred,
        save_path=output_dir / "confusion_matrix.png",
        title="Confusion Matrix - IPL Match Predictor"
    )
    figures['confusion_matrix'] = cm_fig

    # ROC curve
    roc_fig = plot_roc_curve(
        y_test, y_proba,
        save_path=output_dir / "roc_curve.png",
        title="ROC Curve - IPL Match Predictor"
    )
    figures['roc_curve'] = roc_fig

    # Feature importance
    fi_fig = plot_feature_importance(
        model, feature_names, top_n=15,
        save_path=output_dir / "feature_importance.png",
        title="Top 15 Feature Importances"
    )
    if fi_fig:
        figures['feature_importance'] = fi_fig

    # Calibration curve
    cal_fig = plot_calibration_curve(
        y_test, y_proba,
        save_path=output_dir / "calibration_curve.png",
        title="Calibration Curve"
    )
    figures['calibration_curve'] = cal_fig

    # Save metrics to file
    metrics_path = output_dir / "metrics.json"
    import json
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Saved metrics to {metrics_path}")

    # Save report
    report_path = output_dir / "classification_report.txt"
    with open(report_path, 'w') as f:
        f.write(report)
    logger.info(f"Saved classification report to {report_path}")

    logger.info("Evaluation complete!")

    return {
        'metrics': metrics,
        'report': report,
        'figures': figures
    }

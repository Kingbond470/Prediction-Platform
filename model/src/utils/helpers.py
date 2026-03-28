"""
Helper utilities for IPL Match Predictor.
"""
import pandas as pd
from pathlib import Path
from typing import Union, Any, Optional, List
import json


def load_json(filepath: Union[str, Path]) -> dict:
    """
    Load JSON file into dictionary.

    Args:
        filepath: Path to JSON file

    Returns:
        Dictionary with loaded data
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(data: dict, filepath: Union[str, Path], indent: int = 2) -> None:
    """
    Save dictionary to JSON file.

    Args:
        data: Dictionary to save
        filepath: Output file path
        indent: JSON indentation
    """
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent)


def ensure_dir(dirpath: Union[str, Path]) -> Path:
    """
    Create directory if it doesn't exist.

    Args:
        dirpath: Directory path

    Returns:
        Path object
    """
    path = Path(dirpath)
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    Safe division that returns default if denominator is zero or NaN.

    Args:
        numerator: Numerator
        denominator: Denominator
        default: Value to return if division is invalid

    Returns:
        Division result or default
    """
    try:
        if pd.isna(denominator) or denominator == 0:
            return default
        return numerator / denominator
    except (ZeroDivisionError, TypeError):
        return default


def rolling_window_stats(
    df: pd.DataFrame,
    value_col: str,
    window: int,
    group_by: Optional[str] = None,
    date_col: str = 'date'
) -> pd.DataFrame:
    """
    Calculate rolling statistics over a time window.

    Args:
        df: DataFrame with time-ordered data
        value_col: Column to calculate stats on
        window: Number of observations for rolling window
        group_by: Optional column to group by (e.g., 'team')
        date_col: Name of date column for sorting

    Returns:
        DataFrame with rolling statistics columns
    """
    if group_by:
        df = df.sort_values([group_by, date_col])
        grouped = df.groupby(group_by)[value_col]
    else:
        df = df.sort_values(date_col)
        grouped = df[value_col]

    rolling = grouped.rolling(window=window, min_periods=1)

    result = pd.DataFrame({
        f'{value_col}_rolling_mean': rolling.mean(),
        f'{value_col}_rolling_std': rolling.std(),
        f'{value_col}_rolling_min': rolling.min(),
        f'{value_col}_rolling_max': rolling.max(),
    })

    return result


def calculate_win_rate(wins: int, total: int, default: float = 0.0) -> float:
    """
    Calculate win rate safely.

    Args:
        wins: Number of wins
        total: Total matches
        default: Value if total is zero

    Returns:
        Win rate (0-1)
    """
    return safe_divide(wins, total, default=default)


def map_values(series: pd.Series, mapping: dict, default: Any = None) -> pd.Series:
    """
    Map values in a Series using a dictionary, with optional default for unmapped values.

    Args:
        series: Input Series
        mapping: Dictionary mapping old values to new values
        default: Value to use for keys not in mapping (None = keep original)

    Returns:
        Mapped Series
    """
    if default is None:
        return series.map(mapping).fillna(series)
    else:
        return series.map(mapping).fillna(default)


def truncate_string(s: str, max_length: int = 50) -> str:
    """
    Truncate string to maximum length.

    Args:
        s: Input string
        max_length: Maximum length

    Returns:
        Truncated string with ellipsis if needed
    """
    if len(s) <= max_length:
        return s
    return s[:max_length-3] + "..."


def format_percentage(value: float, decimals: int = 1) -> str:
    """
    Format a decimal as percentage string.

    Args:
        value: Decimal value (0-1)
        decimals: Number of decimal places

    Returns:
        Formatted percentage string
    """
    return f"{value * 100:.{decimals}f}%"


def format_confidence(prob: float) -> str:
    """
    Format confidence level with description.

    Args:
        prob: Confidence as decimal (0-1)

    Returns:
        String with confidence level and description
    """
    if prob >= 0.8:
        level = "Very High"
    elif prob >= 0.65:
        level = "High"
    elif prob >= 0.55:
        level = "Moderate"
    elif prob >= 0.45:
        level = "Slight"
    else:
        level = "Uncertain"

    return f"{level} ({prob:.1%})"


def flatten_dict(d: dict, parent_key: str = '', sep: str = '_') -> dict:
    """
    Flatten nested dictionary.

    Args:
        d: Dictionary to flatten
        parent_key: Parent key for recursion
        sep: Separator between keys

    Returns:
        Flattened dictionary
    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict) and v:
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

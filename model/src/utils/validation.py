"""
Data validation utilities for IPL Match Predictor.
"""
import pandas as pd
from typing import List, Dict, Any, Optional
import numpy as np


def validate_schema(df: pd.DataFrame, expected_columns: List[str], strict: bool = True) -> bool:
    """
    Validate that DataFrame has expected columns.

    Args:
        df: DataFrame to validate
        expected_columns: List of required column names
        strict: If True, fail if extra columns exist

    Returns:
        True if schema is valid, raises ValueError otherwise
    """
    actual_columns = set(df.columns)
    expected_set = set(expected_columns)

    missing = expected_set - actual_columns
    extra = actual_columns - expected_set if strict else set()

    if missing:
        raise ValueError(f"Missing columns: {list(missing)}")
    if extra:
        raise ValueError(f"Unexpected columns: {list(extra)}")

    return True


def check_missing_values(df: pd.DataFrame, threshold: float = 0.3) -> List[str]:
    """
    Identify columns with missing values exceeding threshold.

    Args:
        df: DataFrame to check
        threshold: Max allowed missing ratio (0-1). Columns with higher ratio are flagged.

    Returns:
        List of column names with excessive missing values
    """
    missing_ratio = df.isnull().mean()
    problematic = missing_ratio[missing_ratio > threshold].index.tolist()
    return problematic


def detect_outliers_iqr(series: pd.Series, multiplier: float = 1.5) -> pd.Series:
    """
    Detect outliers using Interquartile Range (IQR) method.

    Args:
        series: Numeric Series to check
        multiplier: IQR multiplier (default 1.5 for standard outliers)

    Returns:
        Boolean Series indicating outliers
    """
    Q1 = series.quantile(0.25)
    Q3 = series.quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - multiplier * IQR
    upper_bound = Q3 + multiplier * IQR
    return (series < lower_bound) | (series > upper_bound)


def validate_date_column(df: pd.DataFrame, date_col: str, min_date: Optional[str] = None, max_date: Optional[str] = None) -> bool:
    """
    Validate date column for correct type and range.

    Args:
        df: DataFrame to check
        date_col: Name of date column
        min_date: Minimum allowed date (string format 'YYYY-MM-DD')
        max_date: Maximum allowed date

    Returns:
        True if valid, raises ValueError otherwise
    """
    if date_col not in df.columns:
        raise ValueError(f"Column '{date_col}' not found")

    # Check if datetime
    if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
        raise ValueError(f"Column '{date_col}' must be datetime type")

    # Check for NaT values
    if df[date_col].isna().any():
        raise ValueError(f"Column '{date_col}' contains NaT (missing dates)")

    # Check range if specified
    if min_date:
        min_dt = pd.to_datetime(min_date)
        if (df[date_col] < min_dt).any():
            raise ValueError(f"Found dates before {min_date}")

    if max_date:
        max_dt = pd.to_datetime(max_date)
        if (df[date_col] > max_dt).any():
            raise ValueError(f"Found dates after {max_date}")

    return True


def validate_team_names(df: pd.DataFrame, team_cols: List[str], valid_teams: List[str]) -> Dict[str, List[str]]:
    """
    Check if team names are in the valid set.

    Args:
        df: DataFrame to check
        team_cols: List of columns containing team names
        valid_teams: List of valid team abbreviations (e.g., ['CSK', 'MI', ...])

    Returns:
        Dict mapping column names to list of invalid team names
    """
    invalid_found = {}

    for col in team_cols:
        if col in df.columns:
            unique_teams = df[col].dropna().unique().tolist()
            invalid = [team for team in unique_teams if team not in valid_teams]
            if invalid:
                invalid_found[col] = invalid

    return invalid_found


def check_duplicates(df: pd.DataFrame, subset: Optional[List[str]] = None) -> int:
    """
    Count duplicate rows.

    Args:
        df: DataFrame to check
        subset: Columns to consider for duplicates (None = all columns)

    Returns:
        Number of duplicate rows
    """
    return df.duplicated(subset=subset).sum()


def validate_numeric_range(series: pd.Series, min_val: float, max_val: float, inclusive: bool = True) -> pd.Series:
    """
    Find values outside expected numeric range.

    Args:
        series: Numeric Series to check
        min_val: Minimum allowed value
        max_val: Maximum allowed value
        inclusive: Whether bounds are inclusive

    Returns:
        Boolean Series indicating out-of-range values
    """
    if inclusive:
        return (series < min_val) | (series > max_val)
    else:
        return (series <= min_val) | (series >= max_val)


def assert_no_nulls(df: pd.DataFrame, columns: Optional[List[str]] = None) -> None:
    """
    Assert that specified columns have no null values.

    Args:
        df: DataFrame to check
        columns: Columns to check (None = all columns)

    Raises:
        AssertionError if nulls found
    """
    if columns is None:
        columns = df.columns.tolist()

    for col in columns:
        null_count = df[col].isnull().sum()
        if null_count > 0:
            raise AssertionError(f"Column '{col}' has {null_count} null values")

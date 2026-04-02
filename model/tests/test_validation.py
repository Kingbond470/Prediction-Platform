"""
Tests for validation utilities.
"""
import pytest
import pandas as pd
import numpy as np
from src.utils.validation import (
    validate_schema,
    check_missing_values,
    detect_outliers_iqr,
    validate_date_column,
    validate_numeric_range,
    check_duplicates
)


def test_validate_schema_success():
    """Test schema validation with correct columns."""
    df = pd.DataFrame({'a': [1, 2], 'b': [3, 4], 'c': [5, 6]})
    result = validate_schema(df, ['a', 'b', 'c'])
    assert result is True


def test_validate_schema_missing_columns():
    """Test schema validation with missing columns."""
    df = pd.DataFrame({'a': [1, 2], 'b': [3, 4]})
    with pytest.raises(ValueError, match="Missing columns"):
        validate_schema(df, ['a', 'b', 'c'])


def test_validate_schema_extra_columns_strict():
    """Test schema validation with extra columns in strict mode."""
    df = pd.DataFrame({'a': [1, 2], 'b': [3, 4], 'c': [5, 6], 'd': [7, 8]})
    with pytest.raises(ValueError, match="Unexpected columns"):
        validate_schema(df, ['a', 'b', 'c'], strict=True)


def test_validate_schema_extra_columns_non_strict():
    """Test schema validation with extra columns in non-strict mode."""
    df = pd.DataFrame({'a': [1, 2], 'b': [3, 4], 'c': [5, 6], 'd': [7, 8]})
    result = validate_schema(df, ['a', 'b', 'c'], strict=False)
    assert result is True


def test_check_missing_values():
    """Test missing value detection."""
    df = pd.DataFrame({
        'a': [1, 2, np.nan, 4],
        'b': [1, 2, 3, 4],
        'c': [np.nan, np.nan, 3, 4]
    })
    result = check_missing_values(df, threshold=0.25)
    # Column 'a' has 25% missing (1/4), not > 25% so should not be included with threshold=0.25
    # Column 'c' has 50% missing (2/4), > 25% so should be included
    assert 'c' in result
    assert 'a' not in result  # 25% exactly, not > 25%


def test_detect_outliers_iqr():
    """Test IQR outlier detection."""
    series = pd.Series([1, 2, 3, 4, 5, 100])  # 100 is outlier
    outliers = detect_outliers_iqr(series)
    assert outliers.sum() == 1
    assert outliers.iloc[-1]  # Last element (100) is outlier


def test_validate_date_column():
    """Test date column validation."""
    df = pd.DataFrame({'date': pd.to_datetime(['2023-01-01', '2023-01-02'])})
    assert validate_date_column(df, 'date') is True

    # Test with NaT
    df_nat = pd.DataFrame({'date': [pd.Timestamp('2023-01-01'), pd.NaT]})
    with pytest.raises(ValueError, match="contains NaT"):
        validate_date_column(df_nat, 'date')


def test_validate_numeric_range():
    """Test numeric range validation."""
    series = pd.Series([1, 2, 3, 4, 5, 100])
    outliers = validate_numeric_range(series, 0, 10)
    assert outliers.sum() == 1
    assert outliers.iloc[-1]

    # Test inclusive
    series_boundary = pd.Series([0, 1, 2, 10])
    outliers_inclusive = validate_numeric_range(series_boundary, 0, 10, inclusive=True)
    assert outliers_inclusive.sum() == 0

    outliers_exclusive = validate_numeric_range(series_boundary, 0, 10, inclusive=False)
    assert outliers_exclusive.sum() == 2  # 0 and 10 are out


def test_check_duplicates():
    """Test duplicate detection."""
    df = pd.DataFrame({'a': [1, 1, 2, 3], 'b': [4, 4, 6, 7]})
    count = check_duplicates(df)
    assert count == 1

    count_subset = check_duplicates(df, subset=['a'])
    assert count_subset == 1

"""
Tests for helper utilities.
"""
import pytest
import pandas as pd
from src.utils.helpers import (
    load_json,
    save_json,
    ensure_dir,
    safe_divide,
    map_values,
    truncate_string,
    format_percentage,
    format_confidence,
    flatten_dict,
    rolling_window_stats
)


def test_load_json(tmp_path):
    """Test loading JSON file."""
    json_file = tmp_path / "test.json"
    data = {"key": "value", "number": 42}
    save_json(data, json_file)
    loaded = load_json(json_file)
    assert loaded == data


def test_ensure_dir(tmp_path):
    """Test directory creation."""
    new_dir = tmp_path / "subdir" / "nested"
    result = ensure_dir(new_dir)
    assert result.exists()
    assert result.is_dir()


def test_safe_divide():
    """Test safe division."""
    assert safe_divide(10, 2) == 5.0
    assert safe_divide(10, 0) == 0.0
    assert safe_divide(0, 0) == 0.0
    assert safe_divide(10, 0, default=1.0) == 1.0


def test_map_values():
    """Test value mapping."""
    series = pd.Series(['a', 'b', 'c', 'a'])
    mapping = {'a': 'A', 'b': 'B'}
    result = map_values(series, mapping)
    expected = pd.Series(['A', 'B', 'c', 'A'])  # 'c' stays as 'c' because not in mapping
    assert result.equals(expected)

    # Test with default value
    result_default = map_values(series, mapping, default='Unknown')
    expected_default = pd.Series(['A', 'B', 'Unknown', 'A'])
    assert result_default.equals(expected_default)


def test_truncate_string():
    """Test string truncation."""
    long_str = "a" * 100
    result = truncate_string(long_str, 10)
    assert len(result) == 10
    assert result.endswith("...")

    short_str = "hello"
    assert truncate_string(short_str, 10) == short_str


def test_format_percentage():
    """Test percentage formatting."""
    assert format_percentage(0.5) == "50.0%"
    assert format_percentage(0.1234, decimals=2) == "12.34%"
    assert format_percentage(1.0) == "100.0%"


def test_format_confidence():
    """Test confidence formatting."""
    result = format_confidence(0.8)
    assert "Very High" in result
    assert "80.0%" in result

    result = format_confidence(0.5)
    assert "Moderate" in result

    result = format_confidence(0.3)
    assert "Uncertain" in result


def test_flatten_dict():
    """Test dictionary flattening."""
    nested = {
        'a': 1,
        'b': {
            'c': 2,
            'd': {'e': 3}
        }
    }
    result = flatten_dict(nested)
    expected = {'a': 1, 'b_c': 2, 'b_d_e': 3}
    assert result == expected


def test_rolling_window_stats():
    """Test rolling window statistics."""
    df = pd.DataFrame({
        'date': pd.date_range('2023-01-01', periods=5, freq='D'),
        'team': ['A', 'A', 'A', 'A', 'A'],
        'score': [10, 20, 30, 40, 50]
    })
    result = rolling_window_stats(df, 'score', window=3, group_by='team')

    assert 'score_rolling_mean' in result.columns
    assert len(result) == 5
    # Mean of last 3 scores at index 4 (30,40,50) = 40
    assert result['score_rolling_mean'].iloc[-1] == 40.0

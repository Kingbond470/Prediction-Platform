"""
Tests for data collection module.
"""
import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path
import pandas as pd
from src.data_collection import (
    setup_kaggle_auth,
    download_ipl_datasets,
    validate_raw_files,
    organize_raw_data
)


def test_setup_kaggle_auth_missing_credentials(monkeypatch):
    """Test that authentication fails when credentials are missing."""
    monkeypatch.setenv("KAGGLE_USERNAME", "")
    monkeypatch.setenv("KAGGLE_API_KEY", "")

    with pytest.raises(ValueError, match="Kaggle credentials not found"):
        setup_kaggle_auth()


@patch('src.data_collection.KaggleApi')
def test_setup_kaggle_auth_success(mock_kaggle_api, monkeypatch):
    """Test successful authentication."""
    monkeypatch.setenv("KAGGLE_USERNAME", "test_user")
    monkeypatch.setenv("KAGGLE_API_KEY", "test_key")

    mock_api_instance = MagicMock()
    mock_kaggle_api.return_value = mock_api_instance

    api = setup_kaggle_auth()

    mock_api_instance.authenticate.assert_called_once()
    assert api == mock_api_instance


@patch('src.data_collection.setup_kaggle_auth')
def test_download_ipl_datasets(mock_auth, tmp_path, monkeypatch):
    """Test dataset download function."""
    # Mock config to use temp directory
    from src.config import config
    monkeypatch.setattr(config, 'RAW_DATA_DIR', tmp_path)

    mock_api = MagicMock()
    mock_auth.return_value = mock_api

    # Mock successful download by creating files
    def create_files(dataset, path, unzip, quiet):
        matches_file = path / "matches.csv"
        deliveries_file = path / "deliveries.csv"
        matches_file.write_text("id,season,date,team1,team2,winner\n1,2023,2023-05-01,CSK,MI,CSK")
        deliveries_file.write_text("match_id,inning,batting_team,runs_off_bat\n1,1,CSK,1")

    mock_api.dataset_download_files.side_effect = create_files

    matches_path, deliveries_path = download_ipl_datasets(mock_api)

    assert matches_path.exists()
    assert deliveries_path.exists()


def test_validate_raw_files_success(tmp_path, monkeypatch):
    """Test validation with valid files."""
    from src.config import config
    monkeypatch.setattr(config, 'RAW_DATA_DIR', tmp_path)

    # Create test matches file
    matches_file = tmp_path / "matches.csv"
    matches_file.write_text(
        "id,season,date,team1,team2,winner\n"
        "1,2023,2023-05-01,CSK,MI,CSK"
    )

    result = validate_raw_files(matches_file)
    assert result is True


def test_validate_raw_files_missing(tmp_path):
    """Test validation with missing file."""
    matches_file = tmp_path / "nonexistent.csv"

    with pytest.raises(FileNotFoundError):
        validate_raw_files(matches_file)


def test_organize_raw_data(tmp_path, caplog):
    """Test organize function."""
    from src.data_collection import organize_raw_data
    from src.config import config
    import logging

    caplog.set_level(logging.INFO)

    # Should not raise any errors
    organize_raw_data()

    # Check that info message was logged
    assert any("Organizing raw data files" in record.message for record in caplog.records)

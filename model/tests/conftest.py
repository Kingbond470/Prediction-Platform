"""
Pytest configuration and fixtures for IPL Match Predictor tests.
"""
import pytest
import pandas as pd
from pathlib import Path
from src.config import Config


@pytest.fixture(scope="session")
def config() -> Config:
    """Provide Config instance for tests."""
    return Config()


@pytest.fixture
def sample_matches_df() -> pd.DataFrame:
    """Create a sample matches DataFrame for testing."""
    data = {
        'id': [1, 2, 3, 4, 5],
        'season': [2023, 2023, 2023, 2022, 2022],
        'date': ['2023-05-01', '2023-05-02', '2023-05-03', '2022-05-01', '2022-05-02'],
        'team1': ['CSK', 'MI', 'RCB', 'KKR', 'DC'],
        'team2': ['MI', 'RCB', 'CSK', 'DC', 'KKR'],
        'venue': ['Chepauk', 'Wankhede', 'Chinnaswamy', 'Eden Gardens', 'Arun Jaitley'],
        'city': ['Chennai', 'Mumbai', 'Bangalore', 'Kolkata', 'Delhi'],
        'toss_winner': ['CSK', 'MI', 'RCB', 'KKR', 'DC'],
        'toss_decision': ['bat', 'field', 'bat', 'field', 'bat'],
        'winner': ['CSK', 'MI', 'RCB', 'KKR', 'DC'],
        'result_margin': [5, 8, 3, 15, 7],
        'result': ['normal', 'normal', 'normal', 'normal', 'normal']
    }
    df = pd.DataFrame(data)
    df['date'] = pd.to_datetime(df['date'])
    return df


@pytest.fixture
def sample_deliveries_df() -> pd.DataFrame:
    """Create a sample deliveries DataFrame for testing."""
    data = {
        'match_id': [1, 1, 1, 2, 2],
        'inning': [1, 1, 2, 1, 2],
        'batting_team': ['CSK', 'CSK', 'MI', 'MI', 'RCB'],
        'bowling_team': ['MI', 'MI', 'CSK', 'RCB', 'MI'],
        'over': [1, 2, 1, 1, 2],
        'ball': [1, 1, 1, 1, 1],
        'batter': ['Player A', 'Player B', 'Player C', 'Player D', 'Player E'],
        'bowler': ['Player X', 'Player Y', 'Player Z', 'Player W', 'Player V'],
        'runs_off_bat': [1, 2, 0, 4, 1],
        'wides': [0, 0, 0, 0, 0],
        'noballs': [0, 0, 0, 0, 0],
        'byes': [0, 0, 0, 0, 0],
        'legbyes': [0, 0, 0, 0, 0],
        'wicket': [0, 0, 1, 0, 0]
    }
    return pd.DataFrame(data)

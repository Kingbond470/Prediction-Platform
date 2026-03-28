#!/usr/bin/env python
"""
Test Kaggle authentication.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data_collection import setup_kaggle_auth

try:
    api = setup_kaggle_auth()
    print("Kaggle authentication successful!")
except Exception as e:
    print(f"Kaggle authentication failed: {e}")
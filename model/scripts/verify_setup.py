#!/usr/bin/env python
"""
Quick verification script to check if setup is complete.
"""
import sys
from pathlib import Path

# Add project root to Python path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def main():
    print("=" * 60)
    print("IPL Predictor - Setup Verification")
    print("=" * 60)
    print()

    issues = []

    # Check directories
    dirs_to_check = [
        'src', 'src/utils', 'config', 'scripts', 'tests',
        'data', 'data/raw', 'data/processed', 'data/external',
        'models', 'models/trained', 'models/scalers',
        'logs', 'docs'
    ]

    print("1. Checking directory structure...")
    for dir_path in dirs_to_check:
        if not Path(dir_path).exists():
            print(f"   [MISSING] {dir_path}")
            issues.append(f"Create directory: {dir_path}")
        else:
            print(f"   [OK] {dir_path}")

    # Check core files
    files_to_check = [
        'src/config.py',
        'src/preprocessing.py',
        'src/feature_engineering.py',
        'src/models.py',
        'src/training.py',
        'src/evaluation.py',
        'src/prediction.py',
        'src/data_collection.py',
        'src/utils/logger.py',
        'src/utils/validation.py',
        'src/utils/helpers.py',
        'config/config.yaml',
        'config/team_mapping.json',
        'scripts/run_pipeline.py',
        'scripts/predict_2026.py',
        'scripts/setup_kaggle.py',
        'data/external/ipl_2026_fixtures.csv',
        'requirements.txt',
        '.env.example',
        '.gitignore'
    ]

    print("\n2. Checking core files...")
    for file_path in files_to_check:
        if not Path(file_path).exists():
            print(f"   [MISSING] {file_path}")
            issues.append(f"Create file: {file_path}")
        else:
            print(f"   [OK] {file_path}")

    # Check Python imports
    print("\n3. Testing Python imports...")
    try:
        import yaml
        print("   [OK] pyyaml")
    except ImportError:
        print("   [FAIL] pyyaml not installed")
        issues.append("pip install pyyaml")

    try:
        import joblib
        print("   [OK] joblib")
    except ImportError:
        print("   [FAIL] joblib not installed")
        issues.append("pip install joblib")

    try:
        import xgboost
        print("   [OK] xgboost")
    except ImportError:
        print("   [FAIL] xgboost not installed")
        issues.append("pip install xgboost")

    try:
        import lightgbm
        print("   [OK] lightgbm")
    except ImportError:
        print("   [FAIL] lightgbm not installed")
        issues.append("pip install lightgbm")

    try:
        from src import config
        print("   [OK] src.config")
    except Exception as e:
        print(f"   [FAIL] src.config failed: {e}")
        issues.append("Fix src/config.py")

    # Check .env file
    print("\n4. Checking environment configuration...")
    if not Path('.env').exists():
        print("   [WARN] .env file not found (optional but recommended)")
        print("         Run: python scripts/setup_kaggle.py")
    else:
        print("   [OK] .env exists")

    # Summary
    print("\n" + "=" * 60)
    if issues:
        print(f"\nFound {len(issues)} issues:")
        for issue in issues:
            print(f"  * {issue}")
        print("\nPlease fix these issues before running the pipeline.")
        return 1
    else:
        print("\n[SUCCESS] All checks passed! Setup is complete.")
        print("\nNext steps:")
        print("  1. Run: python scripts/setup_kaggle.py")
        print("  2. Run: python scripts/run_pipeline.py --phase data")
        print("=" * 60)
        return 0


if __name__ == "__main__":
    sys.exit(main())

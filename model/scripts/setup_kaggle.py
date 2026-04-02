#!/usr/bin/env python
"""
Helper script to set up Kaggle credentials.
Run this once to configure your Kaggle API access.
"""
import sys
from pathlib import Path


def main():
    print("=" * 60)
    print("Kaggle API Setup Helper")
    print("=" * 60)
    print()
    print("To use this script, you need a Kaggle account and API token.")
    print()
    print("Steps to get your Kaggle API key:")
    print("1. Log in to https://www.kaggle.com")
    print("2. Go to Account (profile icon -> Account)")
    print("3. Scroll to 'API' section")
    print("4. Click 'Create New Token'")
    print("5. A file 'kaggle.json' will download")
    print("6. Open that file and copy the values")
    print()
    print("-" * 60)

    # Check for existing .env file
    env_path = Path(".env")
    if env_path.exists():
        response = input("Found existing .env file. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Aborted.")
            return 1

    # Get user input
    username = input("Enter Kaggle username: ").strip()
    api_key = input("Enter Kaggle API key: ").strip()

    if not username or not api_key:
        print("Error: Both username and API key are required.")
        return 1

    # Create .env file
    env_content = f"""# Kaggle credentials
KAGGLE_USERNAME={username}
KAGGLE_API_KEY={api_key}

# Optional: Random seed for reproducibility
RANDOM_STATE=42
"""

    with open(env_path, 'w') as f:
        f.write(env_content)

    print()
    print(f"✓ Created .env file at {env_path.absolute()}")
    print("✓ Credentials configured")
    print()
    print("You can now run the data collection:")
    print("  python scripts/run_pipeline.py --phase data")
    print()
    print("Note: The .env file is in .gitignore and will not be committed.")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())

# IPL Match Predictor - Code Explanation Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Design Patterns](#architecture--design-patterns)
3. [Module-by-Module Explanation](#module-by-module-explanation)
4. [Data Flow](#data-flow)
5. [Key Concepts & Algorithms](#key-concepts--algorithms)
6. [Configuration](#configuration)
7. [Running the Pipeline](#running-the-pipeline)
8. [Common Issues & Debugging](#common-issues--debugging)

---

## Project Overview

This project predicts IPL (Indian Premier League) cricket match winners for the 2026 season using machine learning. It processes historical match data (2008-2023) to extract predictive features and trains multiple classification models.

**Core Prediction Task**: Given two teams, venue, and match context, predict which team will win (binary classification: team1 vs team2).

**Main Pipeline Phases**:
1. **Data Collection** - Download/prepare IPL datasets
2. **Preprocessing** - Clean, merge, and encode data
3. **Feature Engineering** - Build predictive features from history
4. **Training** - Train and evaluate models with temporal cross-validation
5. **Prediction** - Generate 2026 season predictions

---

## Architecture & Design Patterns

### 1. **Configuration Management (Singleton Pattern)**
- **File**: `src/config.py`
- **Pattern**: Single global `config` instance accessible from all modules
- **Implementation**: Dataclass with YAML config loading via `_load_yaml_config()`
- **Why**: Centralizes all paths, parameters, and settings in one place

**Key Config Attributes**:
```python
config.RAW_DATA_DIR          # Path to raw data
config.PROCESSED_DATA_DIR    # Path to processed outputs
config.FEATURE_MATRIX_PATH   # Feature matrix CSV location
config.BEST_MODEL_PATH       # Where to save best model
config.features              # Dict with form_window, h2h_window, venue_window
config.training              # Dict with cv_folds, scoring
```

### 2. **Logging (Factory Pattern)**
- **File**: `src/utils/logger.py`
- **Pattern**: `get_logger(name)` returns configured logger instance
- **Features**: Auto-creates logs directory, timestamped log files, avoids duplicate handlers
- **Usage**: `logger = get_logger(__name__)` in each module

### 3. **Model Abstraction (Abstract Base Class)**
- **File**: `src/models.py`
- **Pattern**: `BaseModel` abstract class defines uniform interface
- **Implementations**: `LogisticRegressionModel`, `RandomForestModel`, `XGBoostModel`

**BaseModel Interface**:
```python
class BaseModel(ABC):
    @abstractmethod
    def train(self, X_train, y_train) -> None: ...
    @abstractmethod
    def predict(self, X) -> np.ndarray: ...
    @abstractmethod
    def predict_proba(self, X) -> np.ndarray: ...
    @abstractmethod
    def save(self, path) -> None: ...
    @abstractmethod
    def load(self, path) -> None: ...
```

**Why**: Enables swapping models without changing training code; `create_model(model_type, **kwargs)` factory function.

### 4. **Pipeline Orchestration (Main Script)**
- **File**: `scripts/run_pipeline.py`
- **Pattern**: Sequential execution with phase-specific functions
- **Phases**: `['data', 'features', 'train', 'predict']` or `'all'`
- **Usage**: `python scripts/run_pipeline.py --phase all`

---

## Module-by-Module Explanation

### 1. `src/config.py` - Configuration

**Purpose**: Centralized configuration management.

**How it works**:
1. Creates dataclass with default paths relative to `Path.cwd()`
2. Loads environment variables from `.env` (Kaggle credentials)
3. In `__post_init__()`: creates all required directories, loads YAML config
4. YAML keys are set as attributes (e.g., `config.features`, `config.training`)

**Important**: Must be imported first in dependency chain because other modules import `config` from `src.config`.

**Common Pitfall**: Using wrong attribute names. Check `config/config.yaml` for available keys:
- `config.features['form_window']` (not `config.feature_engineering`)
- `config.training['cv_folds']`

---

### 2. `src/data_collection.py` - Data Acquisition

**Purpose**: Download IPL datasets from Kaggle or use existing files.

**Key Functions**:
- `setup_kaggle_auth()`: Authenticates using `KAGGLE_USERNAME` and `KAGGLE_API_KEY` from `.env`. Creates `~/.kaggle/kaggle.json`.
- `download_ipl_datasets(api)`: Downloads `nowhere19500/ipl-complete-dataset-20082016`.
- `validate_raw_files()`: Checks CSV structure and essential columns.
- `download_and_validate()`: Main entry point called by pipeline.

**Data Flow**:
```
 Kaggle API → download → data/raw/matches.csv, deliveries.csv
          ↓
   validate → organize (no-ops) → return paths
```

**Note**: If files already exist in `data/raw/`, skips download and just validates.

---

### 3. `src/preprocessing.py` - Data Cleaning

**Purpose**: Clean raw CSVs, standardize names, merge datasets, encode categoricals.

**Key Functions**:

#### `clean_matches_data(df, team_mapping)`
- Column standardization: lower case, underscores
- Keeps essential columns: `['id', 'season', 'date', 'team1', 'team2', 'venue', 'city', 'toss_winner', 'toss_decision', 'winner', 'result', 'result_margin']`
- Renames `id` → `match_id`
- Parses dates with `pd.to_datetime()`, drops invalid
- Standardizes team names using `team_mapping.json` (e.g., "Chennai Super Kings" → "CSK")
- Drops rows with missing `winner` (no-result matches)
- **Output**: Cleaned `matches_df` with 12 columns

#### `clean_deliveries_data(df, team_mapping)`
- Column standardization
- Standardizes `batting_team`, `bowling_team`
- Fills numeric columns (`runs_off_bat`, `extras`, etc.) with 0
- Strips whitespace from player names
- **Output**: Cleaned `deliveries_df`

#### `merge_match_deliveries(matches_df, deliveries_df)`
- Aggregates ball-by-ball stats per match: `total_runs`, `total_extras`, `total_wickets`, `total_overs`
- Left-joins to `matches_df` on `match_id`
- **Output**: Enriched `merged_df`

#### `encode_categoricals(df)`
- **Critical**: Creates binary target `winner_encoded`: 1 if team2 wins, else 0
- Label-encodes all categorical columns (except `winner` which is excluded after creating target)
- Saves mappings to `config/categorical_mappings.json` for inference
- **Bug Fixed**: Originally overwrote `winner_encoded` with multi-class encoding; now excludes `winner` from label encoding loop.

#### `clean_and_merge_data()`
Main orchestrator that runs all above steps and saves:
- `data/processed/cleaned_matches.csv`
- `data/processed/cleaned_deliveries.csv`

---

### 4. `src/feature_engineering.py` - Feature Creation

**Purpose**: Generate predictive features from historical match data.

**Key Concept**: **Temporal Awareness** - Features for a match can only use data **before** that match date to prevent data leakage.

#### Team Form Features
`calculate_team_form(team, reference_date, historical_df, window=5)`
- Filters matches where `team` played before `reference_date`
- Takes last `window` matches
- Returns: `win_rate`, `avg_margin`, `streak` (consecutive wins/losses), `matches_played`

#### Head-to-Head Features
`calculate_head_to_head(team1, team2, reference_date, historical_df, window=10)`
- Filters matches between these two teams before reference date
- Returns: `{team1}_h2h_win_pct`, `{team2}_h2h_win_pct`, `h2h_matches`, `h2h_draws`

#### Venue Performance
`calculate_venue_performance(team, venue, reference_date, historical_df, window=10)`
- Team's win rate at specific venue
- Returns: `venue_win_rate`, `venue_matches`, `venue_avg_margin`

#### Derived Features
`add_match_context_features(match_row, historical_df)` combines all above and computes:
- `form_diff` = team1_win_rate - team2_win_rate
- `venue_form_diff` = team1_venue_win_rate - team2_venue_win_rate
- `h2h_win_pct_diff` = team1_h2h_pct - team2_h2h_pct
- Toss features: `toss_winner_is_team1` (binary), `toss_decision_encoded` (bat=1, field=0)
- Date features: `day_of_week`, `month`, `season_period` (early/mid/late)
- **Target**: `winner_encoded` if winner known (for training data)

#### `build_feature_store(matches_df, deliveries_df, save=True)`
- Iterates through all matches in chronological order
- For each match, calls `add_match_context_features()` using **only prior matches** (enforced by date filtering inside each function)
- Drops rows where key features are NaN (insufficient history)
- Calls `encode_categoricals()` again to encode new categorical columns added during feature engineering
- Saves to `data/processed/feature_matrix.csv`

**Important**: The feature store contains one row per historical match with all features pre-computed.

---

### 5. `src/models.py` - Model Wrappers

**Purpose**: Provide unified interface for scikit-learn and XGBoost models.

**Why wrappers needed**: XGBoost has different parameter expectations and input format issues (DataFrame vs array). Wrappers normalize this.

**BaseModel** (ABC):
- `train(X, y)`: Fit model
- `predict(X)`: Return class predictions (0 or 1)
- `predict_proba(X)`: Return probabilities shape (n, 2)
- `save(path)`, `load(path)`: Serialization with joblib
- `get_feature_importance()`: Optional, returns array of feature importances/coefficients

**Implementations**:

#### `LogisticRegressionModel`
- Wraps `sklearn.linear_model.LogisticRegression`
- Default params: `C=1.0`, `penalty='l2'`, `class_weight='balanced'`, `solver='lbfgs'`, `max_iter=1000`
- Returns `|coef_|` as feature importance

#### `RandomForestModel`
- Wraps `sklearn.ensemble.RandomForestClassifier`
- Default: `n_estimators=200`, `max_depth=10`, `min_samples_split=5`, `min_samples_leaf=2`, `class_weight='balanced'`
- Returns `feature_importances_`

#### `XGBoostModel`
- Wraps `xgb.XGBClassifier`
- Default: `n_estimators=300`, `learning_rate=0.05`, `max_depth=6`, `subsample=0.8`, `colsample_bytree=0.8`
- **Critical fix**: `train()`, `predict()`, `predict_proba()` all convert DataFrames to `.values` to avoid XGBoost DataFrame bugs
- Returns `feature_importances_`

**Factory**: `create_model(model_type, **kwargs)` returns model instance.

---

### 6. `src/training.py` - Model Training Pipeline

**Purpose**: Train models with proper temporal validation and select best model.

#### `temporal_split(feature_df, train_cutoff, val_cutoff, date_col='date')`
- **Prevents data leakage**: Splits by date, not randomly
- Train: `date <= train_cutoff`
- Validation: `train_cutoff < date <= val_cutoff`
- Test: `date > val_cutoff`
- Returns: `(train_df, val_df, test_df)`

#### `prepare_training_data(train_df, feature_cols, target_col='winner_encoded')`
- Extracts `X = train_df[feature_cols]`, `y = train_df[target_col]`
- Fits `StandardScaler` on `X`, transforms to `X_scaled`
- Saves scaler to `models/scalers/scaler.pkl`
- **Why scaler saved?**: Same scaling must be applied to validation/test and future prediction data.

#### `cross_validate_model(model, X_train, y_train, cv_folds)`
- Stratified K-Fold CV
- For each fold: train model, predict on val, compute metrics
- Metrics: `accuracy`, `roc_auc`, `f1`, `precision`, `recall`
- Returns dict with mean and std for each metric

#### `train_model(model, X_train, y_train, X_val, y_val, save_path=None)`
- Trains model on full training set
- Evaluates on train and validation sets
- Saves model if `save_path` provided

#### `train_models(feature_df, feature_cols, model_configs, use_cv=True)`
- Main training orchestrator
- Temporally splits data
- Iterates through model configs:
  1. Create model via `create_model()`
  2. Cross-validate (if enough data)
  3. Train on full train, evaluate on val and test
  4. Track best model by validation ROC-AUC
- Saves best model to `config.BEST_MODEL_PATH`
- Saves all results to `data/processed/training_results.json`

#### `train_all_models(feature_matrix_path, feature_cols)`
- Convenience function loading feature matrix from CSV
- Determines feature columns from `config.yaml` (numerical + categorical encoded + derived)
- Calls `train_models()`

**Note**: Feature columns determined from config:
```python
# From config/features
numerical_columns = [...]           # e.g., ['team1_win_rate_last5', ...]
categorical_encoded = [f"{col}_encoded" for col in categorical_columns]
derived_features = ['form_diff', 'venue_form_diff', 'h2h_win_pct_diff']
feature_cols = numerical_columns + categorical_encoded + derived_features
```

---

### 7. `src/prediction.py` - 2026 Predictions

**Purpose**: Load trained model and generate predictions for 2026 fixtures.

#### `load_model(model_path)` / `load_scaler(scaler_path)`
- Uses `joblib.load()` to deserialize
- Returns model/scaler object

#### `load_2026_fixtures(fixtures_path)`
- Reads CSV with `pd.read_csv(comment='#')` to skip comment lines
- Required columns: `team1`, `team2`, `venue`
- Optional: `date`, `toss_winner`, `toss_decision`, `match_id`
- Parses date if present

#### `prepare_match_features(match_info, historical_matches, team_mapping=None)`
- Takes a single match (dict or Series) and historical matches DataFrame
- Standardizes team names via `team_mapping`
- Calls `add_match_context_features(match_series, historical_matches)`
- **This is the critical step** where all rolling statistics (form, h2h, venue) are computed using only historical data (dates before match date)
- Selects feature columns (must match training)
- Returns single-row DataFrame with features

**Important**: Feature columns must exactly match those used during training. Mismatch causes sklearn error: _"Feature names seen differ from during fit"_.

#### `predict_match(model, features, team1_name, team2_name)`
- Takes pre-scaled features DataFrame
- Converts to numpy array for XGBoost compatibility
- `model.predict_proba()` returns `[prob_team1, prob_team2]`
- Returns dict with `predicted_winner`, `prob_team1`, `prob_team2`, `confidence` (abs difference)

#### `predict_batch(model, scaler, fixtures_df, historical_matches, feature_cols)`
- Iterates through fixtures
- For each match:
  1. `prepare_match_features()` → features (unscaled)
  2. Align columns (add missing cols with 0)
  3. Reorder to match training order
  4. Scale with `scaler.transform()`
  5. Convert to array for XGBoost
  6. `predict_match()` → result dict
- Collects results, skips matches with missing teams
- Returns predictions DataFrame with columns:
  `match_id, team1, team2, venue, date, toss_winner, toss_decision, predicted_winner, prob_team1, prob_team2, confidence`

#### `generate_2026_predictions(...)`
- Main entry point called by pipeline
- Loads model, scaler, historical feature matrix, fixtures
- Determines `feature_cols` from config (must match training)
- Calls `predict_batch()`
- Saves predictions CSV to `data/processed/predictions_2026.csv`
- Logs summary (counts per predicted winner)

#### `generate_report(predictions_df, output_path)`
- Creates markdown report at `docs/predictions_2026_report.md`
- Sections:
  - Summary by team (predicted wins, percentages)
  - High confidence predictions (≥70%)
  - Close matches (<30% confidence)
  - Any errors (matches where prediction failed)

---

### 8. `src/utils/` - Helper Modules

#### `logger.py`
- `get_logger(name, log_level='INFO', log_to_file=True)`
- Creates logger with console + file handlers (timestamped in `logs/`)
- Prevents duplicate handlers if called multiple times

#### `helpers.py`
- `load_json()`, `save_json()`: JSON file I/O
- `ensure_dir()`: `mkdir -p` equivalent
- `safe_divide(numerator, denominator, default=0.0)`: Avoid division by zero
- `calculate_win_rate(wins, total, default=0.0)`: Wrapper around `safe_divide`
- `rolling_window_stats()`: Generic rolling window aggregations (not currently used)

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    PIPELINE EXECUTION                   │
└─────────────────────────────────────────────────────────┘
                              │
                    python scripts/run_pipeline.py --phase all
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  ┌─────────┐         ┌──────────┐         ┌──────────┐
  │  DATA   │───────▶ │PREPROCESS│───────▶│ FEATURES │
  │COLLECTION│         │   & ENCODE│         │ ENGINEER│
  └─────────┘         └──────────┘         └──────────┘
        │                     │                     │
        │ raw/                │ cleaned/            │ feature_matrix.csv
        │ matches.csv         │ cleaned_matches.csv  │ (one row per match)
        │ deliveries.csv      │ + mappings.json     │
        │                     │                     │
        │                     ▼                     ▼
        │               ┌──────────┐         ┌──────────┐
        │               │  TEMPORAL│         │  TRAIN   │
        │               │  SPLIT   │────────▶│ MODELS   │
        │               └──────────┘         └──────────┘
        │                     │                     │
        │                     │ train/val/test      │ best_model.pkl
        │                     │                     │ scaler.pkl
        │                     ▼                     │ training_results.json
        │               ┌──────────┐               │
        │               │  CROSS-  │               │
        └──────────────▶│ VALIDATION│──────────────┘
                        └──────────┘
                              │
                              ▼
                       ┌────────────┐
                       │ PREDICTION │
                       │   PHASE    │
                       └────────────┘
                              │
                              ▼
                    predictions_2026.csv
                    predictions_report.md
```

**Detailed Data Flow**:

1. **Data Collection**
   ```
   Kaggle API → data/raw/matches.csv, deliveries.csv
   ```

2. **Preprocessing**
   ```
   matches.csv + team_mapping.json → clean_matches_data()
                              ↓
                    add 'winner_encoded' binary target
                    encode categoricals → categorical_mappings.json
                              ↓
                    cleaned_matches.csv
   ```

3. **Feature Engineering**
   ```
   cleaned_matches.csv + cleaned_deliveries.csv
                              ↓
                For each match (chronological):
                - Compute form using only prior matches
                - Compute H2H using only prior matches
                - Compute venue stats using only prior matches
                              ↓
                    feature_matrix.csv (rows = matches, cols = features)
   ```

4. **Training**
   ```
   feature_matrix.csv
          │
          ├─▶ Temporal split (train/val/test by date)
          │
          ├─▶ StandardScaler fit on train → save scaler
          │
          ├─▶ For each model:
          │   - Cross-validate on train
          │   - Train on full train
          │   - Evaluate on val and test
          │
          └─▶ Select best by val ROC-AUC → save best_model.pkl
   ```

5. **Prediction**
   ```
   best_model.pkl + scaler.pkl + feature_matrix.csv (historical)
          │
          ├─▶ Load 2026 fixtures
          │
          ├─▶ For each fixture:
          │   - prepare_match_features(match, historical_df)
          │   - Scale with saved scaler
          │   - Predict probabilities
          │   - Determine winner
          │
          └─▶ Save predictions CSV + markdown report
   ```

---

## Key Concepts & Algorithms

### 1. **Temporal Validation**

**Problem**: Random split would cause data leakage (future information used to predict past).

**Solution**: Split by date:
```python
train: date <= 2020-12-31
val:   2021-01-01 < date <= 2023-12-31
test:  date > 2023-12-31
```

**Implementation**: `temporal_split()` in `training.py` uses pandas datetime filtering.

**Why**: Mimics real-world scenario where model trained on historical data predicts future matches.

### 2. **Feature Leakage Prevention**

**Risk**: When computing features for match on date D, only use matches with date < D.

**Implementations**:
- `calculate_team_form()`: `historical_df[date < reference_date]`
- `calculate_head_to_hand()`: same
- `calculate_venue_performance()`: same

**Enforcement**: All feature functions take `reference_date` and filter accordingly.

### 3. **Binary Classification**

Target: `winner_encoded = 1` if `team2` wins, else `0`.

Prediction: `predict_proba()` returns `[P(team1 wins), P(team2 wins)]`.

Winner: whichever probability is higher.

**Note**: This binary framing means team order matters! The model learns relative strength between team1 and team2, not absolute win probabilities for each team independently.

### 4. **Standardization**

`StandardScaler` fitted on training features, saved, then used for validation/test/prediction.

**Why**: Needed for Logistic Regression and XGBoost (benefits from scaling). Also ensures consistency.

### 5. **Cross-Validation Strategy**

`StratifiedKFold` with `n_splits=cv_folds` (default 5).

- Stratified: preserves class distribution in each fold
- Shuffle=True: randomizes fold assignment
- Metrics averaged across folds

**When skipped**: If training data has fewer than 100 samples (`use_cv and len(X_train) > 100`).

### 6. **Best Model Selection**

Models compared by validation ROC-AUC (rank-based metric, robust to class imbalance).

If multiple models have similar ROC-AUC, the last one with highest score is saved (arbitrary tie-breaker).

---

## Configuration

### `config/config.yaml` Structure

```yaml
data:                      # File paths
  raw_matches: "data/raw/matches.csv"
  raw_deliveries: "data/raw/deliveries.csv"
  processed_matches: "data/processed/cleaned_matches.csv"
  feature_matrix: "data/processed/feature_matrix.csv"
  predictions_2026: "data/processed/predictions_2026.csv"
  external_fixtures: "data/external/ipl_2026_fixtures.csv"

features:                  # Feature engineering parameters
  categorical_columns: [team1, team2, venue, city, toss_winner, toss_decision]
  numerical_columns: [team1_win_rate_last5, team2_win_rate_last5, ...]
  target: "winner_encoded"
  validation_strategy: "temporal"
  train_cutoff: "2020-12-31"      # Train on matches up to this date
  val_cutoff: "2023-12-31"        # Validate on 2021-2023
  form_window: 5                   # Recent form: last 5 matches
  h2h_window: 10                   # H2H: last 10 encounters
  venue_window: 10                 # Venue: last 10 matches at venue

models:                     # Model hyperparameters
  random_state: 42
  n_jobs: -1
  logistic_regression:
    C: 1.0
    penalty: "l2"
    max_iter: 1000
    solver: "lbfgs"
  random_forest:
    n_estimators: 200
    max_depth: 10
    min_samples_split: 5
    min_samples_leaf: 2
  xgboost:
    n_estimators: 300
    learning_rate: 0.05
    max_depth: 6
    subsample: 0.8
    colsample_bytree: 0.8

training:
  cv_folds: 5
  scoring: "roc_auc"

prediction:
  output_csv: "data/processed/predictions_2026.csv"
  output_report: "docs/predictions_2026_report.md"
```

**Important**: The `features` key (not `feature_engineering`). This caused bugs in initial implementation.

### `.env` File

```
KAGGLE_USERNAME=your_username
KAGGLE_API_KEY=your_api_key_from_kaggle_account
RANDOM_STATE=42
```

If Kaggle credentials not provided, pipeline can use sample data via `scripts/generate_sample_data.py`.

---

## Running the Pipeline

### Full Pipeline (All Phases)

```bash
# Clean previous outputs (optional)
rm -rf data/processed/* models/ logs/

# Run all phases: data collection → preprocessing → features → training → prediction
python scripts/run_pipeline.py --phase all
```

Output files:
- `data/processed/feature_matrix.csv` - All features for historical matches
- `models/trained/best_model.pkl` - Best model (by val ROC-AUC)
- `models/scalers/scaler.pkl` - Fitted StandardScaler
- `data/processed/predictions_2026.csv` - 2026 match predictions
- `docs/predictions_2026_report.md` - Human-readable summary

### Individual Phases

```bash
# Phase 1: Data collection only
python scripts/run_pipeline.py --phase data

# Phase 2: Preprocessing (depends on raw data)
python scripts/run_pipeline.py --phase features

# Phase 3: Training (depends on feature matrix)
python scripts/run_pipeline.py --phase train

# Phase 4: Prediction (depends on trained model)
python scripts/run_pipeline.py --phase predict
```

### Using Sample Data (No Kaggle Required)

```bash
# Generate synthetic data for testing
python scripts/generate_sample_data.py

# Then run pipeline
python scripts/run_pipeline.py --phase all
```

**Note**: Sample data uses seasons 2008-2017, so temporal cutoffs in `config.yaml` may need adjustment (as done in fixes).

---

## Common Issues & Debugging

### 1. **Kaggle API 403 Forbidden**
**Symptom**: `403 Client Error: Forbidden for url: https://api.kaggle.com...`
**Cause**: Missing/invalid Kaggle credentials in `.env`
**Fix**:
- Create `.env` with valid `KAGGLE_USERNAME` and `KAGGLE_API_KEY`
- Get API key from https://www.kaggle.com/account/api
- Or use sample data: `python scripts/generate_sample_data.py`

### 2. **UnicodeEncodeError on Windows**
**Symptom**: `'charmap' codec can't encode character '\u2713'`
**Cause**: Checkmark character `✓` in log messages not supported by Windows console encoding
**Fix**: Replace with ASCII (already done): `logger.info("...")` instead of f-strings with `✓`

### 3. **config.feature_engineering AttributeError**
**Symptom**: `'Config' object has no attribute 'feature_engineering'`
**Cause**: Code references `config.feature_engineering` but YAML uses `features` key
**Fix**: Use `config.features` everywhere (already fixed)

### 4. **StandardScaler with 0 samples**
**Symptom**: `ValueError: Found array with 0 sample(s)...`
**Cause**: Temporal split cutoffs exclude all validation/test data (dates too recent for sample data)
**Fix**: Adjust `train_cutoff` and `val_cutoff` in `config.yaml` to split sample data appropriately.

### 5. **XGBoost DataFrame errors**
**Symptom**: `'DataFrame' object has no attribute 'dtype'` or `multi_class must be in ('ovo', 'ovr')`
**Cause**: XGBoost version incompatibility with pandas DataFrames; also roc_auc_score fails on multi-class predictions.
**Fix**:
- Convert DataFrames to `.values` before passing to XGBoost `predict`/`predict_proba` (done)
- Ensure binary classification (already fixed `encode_categoricals`)

### 6. **Feature names mismatch during prediction**
**Symptom**: `The feature names should match those that were passed during fit.`
**Cause**: `feature_cols` in prediction doesn't exactly match training feature set.
**Fix**:
- Compare `config/features/numerical_columns` with derived features actually used
- Remove any extra features (like `season_period`) that aren't in training set
- Training uses: `numerical_columns + [col+'_encoded' for col in categorical_columns] + ['form_diff', 'venue_form_diff', 'h2h_win_pct_diff']`

### 7. **CSV Parsing Errors**
**Symptom**: `Error tokenizing data. Expected X fields, saw Y.`
**Cause**: Comment lines or malformed CSV
**Fix**:
- Use `pd.read_csv(comment='#')` for fixtures with comments
- Ensure CSV has correct number of columns
- Check for trailing commas or unquoted fields with commas

### 8. **Low Validation/Test Accuracy**
**Symptom**: Training accuracy ~100%, validation ~40% (random)
**Causes**:
- Overfitting (complex models on small data)
- Insufficient predictive signal in features
- Sample data is random/noisy (not real IPL patterns)
- Temporal split leaves too little validation data

**Not necessarily a bug**: With synthetic random data, models can't learn real patterns. With real data, you should see validation accuracy >50% (better than random).

---

## Testing

Run pytest suite:
```bash
pytest tests/ -v
```

Test coverage:
- `tests/test_data_collection.py`: Kaggle auth, file validation
- `tests/test_validation.py`: Schema, missing values, date validation
- `tests/test_helpers.py`: Utility functions (safe_divide, win_rate, rolling stats)

---

## Extending the Project

### Adding New Features

1. **In `feature_engineering.py`**: Add function following pattern:
   ```python
   def calculate_your_feature(team, reference_date, historical_df, ...):
       # Filter by reference_date
       # Compute metric
       return {'feature_name': value}
   ```

2. **In `add_match_context_features()`**: Call your function and add to `features` Series.

3. **Update `config.yaml`**: If new feature is numerical, add to `features.numerical_columns` (or create new list).

4. **Update prediction**: No changes needed if feature auto-generated; otherwise update `feature_cols` in `train_all_models()` and `generate_2026_predictions()`.

### Trying New Models

1. Add class in `src/models.py` inheriting `BaseModel`
2. Implement required methods (`train`, `predict`, `predict_proba`, `save`, `load`)
3. Add to `create_model()` factory
4. Add hyperparameters to `config.yaml` under `models.<your_model>`
5. Pipeline will automatically train and evaluate it.

---

## Files Reference

```
match-predictor/
├── config/
│   ├── config.yaml              # Main configuration
│   └── team_mapping.json        # Team name standardization
├── data/
│   ├── raw/                     # Input (manually populated or via Kaggle)
│   │   ├── matches.csv
│   │   └── deliveries.csv
│   ├── processed/               # Pipeline outputs
│   │   ├── cleaned_matches.csv
│   │   ├── cleaned_deliveries.csv
│   │   ├── feature_matrix.csv
│   │   ├── predictions_2026.csv
│   │   └── training_results.json
│   └── external/
│       └── ipl_2026_fixtures.csv  # 2026 schedule
├── docs/
│   └── predictions_2026_report.md   # Auto-generated report
├── logs/                        # Timestamped log files
├── models/
│   ├── trained/
│   │   └── best_model.pkl
│   └── scalers/
│       └── scaler.pkl
├── scripts/
│   ├── run_pipeline.py          # Main CLI
│   ├── generate_sample_data.py  # Create synthetic data
│   └── setup_kaggle.py          # Interactive Kaggle cred setup
├── src/
│   ├── config.py                # Config singleton
│   ├── data_collection.py       # Kaggle download
│   ├── preprocessing.py         # Cleaning & encoding
│   ├── feature_engineering.py   # Feature calculations
│   ├── models.py                # Model wrappers
│   ├── training.py              # Training pipeline
│   ├── prediction.py            # 2026 predictions
│   └── utils/
│       ├── logger.py            # Logging factory
│       ├── helpers.py           # JSON, safe_divide, etc.
│       └── validation.py        # Schema checks
└── tests/
    ├── conftest.py              # Shared fixtures
    ├── test_data_collection.py
    ├── test_validation.py
    └── test_helpers.py
```

---

## Appendix: Glossary

- **Temporal split**: Splitting data by date to prevent leakage
- **Feature leakage**: Using information from the future to predict the past
- **Binary classification**: Predicting one of two classes (team1 win vs team2 win)
- **ROC-AUC**: Area under ROC curve; measures ranking quality (0.5=random, 1.0=perfect)
- **StandardScaler**: Standardizes features to mean=0, std=1
- **Label encoding**: Converting categorical values to integers
- **Data leakage**: When training data contains information not available at prediction time

---

**Last Updated**: 2026-03-28
**Project Version**: 1.0

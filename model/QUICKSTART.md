# Quick Start Guide

## Setup Complete!

Your IPL 2026 Match Winner Predictor has been fully implemented with all core components.

## What Was Built

### Complete ML Pipeline:
1. **Configuration System** - Centralized config with YAML + environment variables
2. **Data Collection** - Kaggle API integration with authentication
3. **Preprocessing** - Team name standardization, date parsing, missing value handling
4. **Feature Engineering** - Team form, head-to-head, venue performance, derived features
5. **Models** - Logistic Regression, Random Forest, XGBoost with unified interface
6. **Training** - Temporal split, cross-validation, hyperparameter tuning
7. **Evaluation** - Comprehensive metrics and visualizations
8. **Prediction** - Generate 2026 season predictions with confidence scores
9. **CLI** - End-to-end pipeline runner

### Testing Infrastructure:
- pytest framework with fixtures
- Unit tests for data collection, validation, helpers
- Verification script included

## Next Steps

### 1. Configure Kaggle API
```bash
python scripts/setup_kaggle.py
```
Or manually copy `.env.example` to `.env` and fill in your credentials.

### 2. Download IPL Data
```bash
python scripts/run_pipeline.py --phase data
```

### 3. Preprocess & Build Features
```bash
python scripts/run_pipeline.py --phase features
```

### 4. Train Models
```bash
python scripts/run_pipeline.py --phase train
```

### 5. Generate Predictions
```bash
python scripts/run_pipeline.py --phase predict
```

Or run all phases at once:
```bash
python scripts/run_pipeline.py --phase all
```

## Project Structure

```
match-predictor/
├── src/              # Core source code
│   ├── config.py     # Configuration
│   ├── data_collection.py
│   ├── preprocessing.py
│   ├── feature_engineering.py  # Critical
│   ├── models.py
│   ├── training.py
│   ├── evaluation.py
│   ├── prediction.py
│   └── utils/
├── config/           # YAML configs & mappings
├── scripts/          # CLI runners
├── tests/            # Unit tests
├── data/             # Data files
│   ├── raw/          # Kaggle downloads
│   ├── processed/    # Cleaned data & features
│   └── external/     # 2026 fixtures
├── models/           # Saved models & scalers
└── docs/             # Reports
```

## Customization

- Edit `config/config.yaml` to adjust:
  - Feature engineering parameters (window sizes)
  - Model hyperparameters
  - Data split dates
  - File paths

- Update `config/team_mapping.json` for any new teams or name variants

- In `src/feature_engineering.py`, you can add more features:
  - Player statistics (if available in data)
  - Weather/venue conditions
  - Advanced metrics

## Testing

```bash
# Run all tests
pytest tests/ -v

# With coverage
pytest tests/ -v --cov=src --cov-report=html

# Verify setup
python scripts/verify_setup.py
```

## Expected Outputs

After running the full pipeline:

1. **Historical feature matrix**: `data/processed/feature_matrix.csv`
   - ~500 matches (historical IPL seasons)
   - ~20 features (form, H2H, venue, toss, etc.)

2. **Best model**: `models/trained/best_model.pkl`
   - Selected from LR, RF, XGBoost based on validation performance

3. **Evaluation plots**: `models/evaluation/`
   - confusion_matrix.png
   - roc_curve.png
   - feature_importance.png
   - calibration_curve.png
   - metrics.json

4. **2026 predictions**: `data/processed/predictions_2026.csv`
   - Columns: match_id, team1, team2, venue, predicted_winner, prob_team1, prob_team2, confidence

5. **Report**: `docs/predictions_2026_report.md`
   - Summary by team
   - High confidence picks
   - Close matches

## Notes

- Ensure you have a Kaggle account and API key for data download
- The 2026 fixtures file is a template - fill in the actual schedule when announced
- Model performance depends heavily on quality and quantity of historical data
- All data files can be regenerated except for the raw Kaggle download
- The web interface (Phase 5) can be added later using Streamlit if needed

## Troubleshooting

**Import errors**: Make sure you're running from the project root directory or have added it to PYTHONPATH.

**Kaggle auth fails**: Verify your API key is correct in `.env` and that the kaggle.json token is properly formatted.

**Feature generation slow**: For large datasets, feature engineering can be optimized by caching intermediate results or using vectorized operations.

**Missing features**: Check that `config/config.yaml` is correctly formatted and loaded. The config is loaded during `Config()` initialization.

---

Enjoy your IPL 2026 predictions!

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder

from app.ml.adapters.base import TrainingAdapter
from app.ml.advertising_features import (
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    RAW_FEATURES,
    advertising_feature_frame,
)
from app.pipeline import read_dataset


class AdvertisingLightGBMTrainingAdapter(TrainingAdapter):
    model_type = "lgbm_advertising_revenue"
    target = "revenue"

    def validate_dataset(self, dataset_path: Path, config: dict) -> None:
        data = read_dataset(dataset_path, 50)
        required = {*RAW_FEATURES, self.target}
        if not required.issubset(data.columns):
            raise ValueError(f"Missing advertising training fields: {sorted(required - set(data.columns))}")

    def train(self, dataset_path: Path, config: dict, output_dir: Path) -> None:
        data = read_dataset(dataset_path)
        data["date"] = pd.to_datetime(data["date"], errors="coerce")
        data["ad_spend"] = pd.to_numeric(data["ad_spend"], errors="coerce")
        data["revenue"] = pd.to_numeric(data["revenue"], errors="coerce")
        data = data.dropna(subset=[*RAW_FEATURES, self.target]).sort_values("date").reset_index(drop=True)
        if len(data) < 30:
            raise ValueError("At least 30 valid advertising rows are required")
        split = max(1, min(len(data) - 1, int(len(data) * 0.85)))
        train, holdout = data.iloc[:split], data.iloc[split:]

        preprocessor = ColumnTransformer([
            ("numeric", SimpleImputer(strategy="median"), NUMERIC_FEATURES),
            ("categorical", Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]), CATEGORICAL_FEATURES),
        ])
        pipeline = Pipeline([
            ("features", FunctionTransformer(advertising_feature_frame, validate=False)),
            ("preprocessor", preprocessor),
            ("estimator", LGBMRegressor(
                objective="regression", n_estimators=500, learning_rate=0.03,
                num_leaves=15, max_depth=6, min_child_samples=20,
                subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
                reg_alpha=1.0, reg_lambda=5.0,
                random_state=int(config.get("random_seed", 42)), n_jobs=1, verbosity=-1,
            )),
        ])
        pipeline.fit(train[RAW_FEATURES], train[self.target])
        prediction = np.maximum(pipeline.predict(holdout[RAW_FEATURES]), 0)
        actual = holdout[self.target].to_numpy()
        metrics = {
            "mae": float(mean_absolute_error(actual, prediction)),
            "rmse": float(np.sqrt(mean_squared_error(actual, prediction))),
            "r2": float(r2_score(actual, prediction)) if len(actual) > 1 else 0.0,
            "holdout_rows": int(len(holdout)),
        }
        manifest = {
            "model_type": self.model_type,
            "domain": "advertising",
            "target": self.target,
            "output_type": "point_prediction",
            "currency": config.get("currency", "USD"),
            "feature_columns": RAW_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "categories": {field: sorted(str(value) for value in data[field].dropna().unique()) for field in CATEGORICAL_FEATURES},
            "training_dataset_version": config["dataset_version_id"],
            "training_rows": int(len(train)),
            "training_date_min": train["date"].min().date().isoformat(),
            "training_date_max": train["date"].max().date().isoformat(),
        }
        joblib.dump(pipeline, output_dir / "model.joblib")
        (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
        (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))

    def evaluate(self, output_dir: Path) -> dict:
        return json.loads((output_dir / "metrics.json").read_text())

    def export_artifacts(self, output_dir: Path) -> dict:
        return json.loads((output_dir / "manifest.json").read_text())

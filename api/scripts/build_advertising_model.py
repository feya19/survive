"""Build the bundled advertising revenue artifact with the runtime dependencies."""

import argparse
import hashlib
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor, early_stopping, log_evaluation
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


CATEGORICAL_FEATURES = ["platform", "campaign_type", "industry", "country"]
MODEL_FEATURES = ["ad_spend", "date", *CATEGORICAL_FEATURES]
DERIVED_NUMERIC_FEATURES = [
    "ad_spend", "log_ad_spend", "year", "month", "day_of_week",
    "day_of_month", "quarter", "month_sin", "month_cos",
    "weekday_sin", "weekday_cos",
]


def feature_frame(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    result["date"] = pd.to_datetime(result["date"], errors="coerce")
    result["ad_spend"] = pd.to_numeric(result["ad_spend"], errors="coerce")
    result["log_ad_spend"] = np.log1p(result["ad_spend"])
    result["year"] = result["date"].dt.year
    result["month"] = result["date"].dt.month
    result["day_of_week"] = result["date"].dt.dayofweek
    result["day_of_month"] = result["date"].dt.day
    result["quarter"] = result["date"].dt.quarter
    result["month_sin"] = np.sin(2 * np.pi * result["month"] / 12)
    result["month_cos"] = np.cos(2 * np.pi * result["month"] / 12)
    result["weekday_sin"] = np.sin(2 * np.pi * result["day_of_week"] / 7)
    result["weekday_cos"] = np.cos(2 * np.pi * result["day_of_week"] / 7)
    return result[DERIVED_NUMERIC_FEATURES + CATEGORICAL_FEATURES]


def grouped_rows(frame: pd.DataFrame, field: str) -> list[dict]:
    grouped = frame.groupby(field, dropna=False)["revenue"].agg(["count", "mean"]).reset_index()
    return [
        {field: str(row[field]), "campaign_count": int(row["count"]), "average_revenue": float(row["mean"])}
        for _, row in grouped.sort_values(field).iterrows()
    ]


def build(source: Path, output: Path) -> None:
    frame = pd.read_csv(source)
    frame.columns = frame.columns.astype(str).str.strip().str.lower().str.replace(r"[^a-z0-9]+", "_", regex=True).str.strip("_")
    required = {"date", "ad_spend", "revenue", *CATEGORICAL_FEATURES}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Missing advertising columns: {sorted(missing)}")
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["ad_spend"] = pd.to_numeric(frame["ad_spend"], errors="coerce")
    frame["revenue"] = pd.to_numeric(frame["revenue"], errors="coerce")
    frame = frame.drop_duplicates().dropna(subset=list(required)).copy()
    frame = frame[(frame["ad_spend"] >= 0) & (frame["revenue"] >= 0)].sort_values("date").reset_index(drop=True)
    if len(frame) < 30:
        raise ValueError("At least 30 valid advertising rows are required")

    split = int(len(frame) * 0.85)
    train, holdout = frame.iloc[:split], frame.iloc[split:]
    preprocessor = ColumnTransformer([
        ("numeric", SimpleImputer(strategy="median"), DERIVED_NUMERIC_FEATURES),
        ("categorical", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]), CATEGORICAL_FEATURES),
    ])
    train_features = feature_frame(train)
    holdout_features = feature_frame(holdout)
    x_train = preprocessor.fit_transform(train_features)
    x_holdout = preprocessor.transform(holdout_features)
    y_train = np.log1p(train["revenue"].to_numpy())
    y_holdout = holdout["revenue"].to_numpy()
    estimator = LGBMRegressor(
        objective="regression", n_estimators=1500, learning_rate=0.02,
        num_leaves=15, max_depth=6, min_child_samples=30,
        subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
        reg_alpha=1.0, reg_lambda=5.0, random_state=42, n_jobs=1, verbosity=-1,
    )
    estimator.fit(
        x_train, y_train,
        eval_set=[(x_holdout, np.log1p(y_holdout))], eval_metric="rmse",
        callbacks=[early_stopping(100, verbose=False), log_evaluation(0)],
    )
    prediction = np.maximum(np.expm1(estimator.predict(x_holdout)), 0)
    metrics = {
        "mae": float(mean_absolute_error(y_holdout, prediction)),
        "rmse": float(np.sqrt(mean_squared_error(y_holdout, prediction))),
        "r2": float(r2_score(y_holdout, prediction)),
        "holdout_rows": int(len(holdout)),
    }
    categories = {
        field: sorted(str(value) for value in frame[field].dropna().unique())
        for field in CATEGORICAL_FEATURES
    }
    scatter = frame.iloc[np.linspace(0, len(frame) - 1, min(160, len(frame)), dtype=int)]
    analytics = {
        "record_count": int(len(frame)),
        "average_revenue": float(frame["revenue"].mean()),
        "median_revenue": float(frame["revenue"].median()),
        "median_ad_spend": float(frame["ad_spend"].median()),
        "revenue_by_platform": grouped_rows(frame, "platform"),
        "revenue_by_campaign_type": grouped_rows(frame, "campaign_type"),
        "revenue_by_industry": grouped_rows(frame, "industry"),
        "spend_revenue_scatter": [
            {"ad_spend": float(row.ad_spend), "revenue": float(row.revenue), "platform": str(row.platform)}
            for row in scatter.itertuples()
        ],
    }
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    bundle = {
        "artifact_version": "1",
        "model_type": "lgbm_advertising_revenue",
        "domain": "advertising",
        "target": "revenue",
        "prediction_type": "point",
        "currency": "USD",
        "feature_columns": MODEL_FEATURES,
        "derived_numeric_features": DERIVED_NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "categories": categories,
        "preprocessor": preprocessor,
        "estimator": estimator,
        "target_transform": "log1p",
        "metrics": metrics,
        "analytics": analytics,
        "training_rows": int(len(train)),
        "training_date_min": train["date"].min().date().isoformat(),
        "training_date_max": train["date"].max().date().isoformat(),
        "source_sha256": source_hash,
        "limitations": [
            "Revenue is a point estimate from historical advertising performance.",
            "Spend comparisons are model-based what-if estimates, not causal effects.",
            "The model assumes ad_spend is known when the campaign is planned.",
            "Clicks, conversions, CTR, CPC, CPA, and ROAS are excluded to avoid outcome leakage.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, output)
    print({"output": str(output), "metrics": metrics, "categories": categories})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True, help="Use app/ml/assets/advertising_revenue.joblib for the bundled model")
    args = parser.parse_args()
    build(args.input, args.output)

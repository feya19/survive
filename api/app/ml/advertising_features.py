"""Stable feature engineering used by advertising training and inference artifacts."""

import numpy as np
import pandas as pd


CATEGORICAL_FEATURES = ["platform", "campaign_type", "industry", "country"]
RAW_FEATURES = ["ad_spend", "date", *CATEGORICAL_FEATURES]
NUMERIC_FEATURES = [
    "ad_spend", "log_ad_spend", "year", "month", "day_of_week",
    "day_of_month", "quarter", "month_sin", "month_cos",
    "weekday_sin", "weekday_cos",
]


def advertising_feature_frame(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    dates = pd.to_datetime(result["date"], errors="coerce")
    spend = pd.to_numeric(result["ad_spend"], errors="coerce")
    result["ad_spend"] = spend
    result["log_ad_spend"] = np.log1p(spend)
    result["year"] = dates.dt.year
    result["month"] = dates.dt.month
    result["day_of_week"] = dates.dt.dayofweek
    result["day_of_month"] = dates.dt.day
    result["quarter"] = dates.dt.quarter
    result["month_sin"] = np.sin(2 * np.pi * result["month"] / 12)
    result["month_cos"] = np.cos(2 * np.pi * result["month"] / 12)
    result["weekday_sin"] = np.sin(2 * np.pi * result["day_of_week"] / 7)
    result["weekday_cos"] = np.cos(2 * np.pi * result["day_of_week"] / 7)
    return result[NUMERIC_FEATURES + CATEGORICAL_FEATURES]

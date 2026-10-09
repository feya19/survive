import json
from pathlib import Path
from unittest.mock import patch
import pandas as pd
import pytest
from app.pipeline import suggest, validate_mapping, standardize, profile


def test_deterministic_mapping():
    columns = [{"name": name, "dtype": "object"} for name in ["Film Category", "Production Cost", "Marketing Spend", "Production Days", "Box Office Income"]]
    result = suggest(columns)
    assert {m["target_column"] for m in result["mappings"]} == {"genre", "budget", "marketing_budget", "planned_duration", "revenue"}


def test_real_notebook_dataset_aliases():
    result = suggest([{"name": name, "dtype": "object"} for name in ["BudgetUSD", "Global_BoxOfficeUSD", "Genre", "ReleaseDate"]])
    assert {m["source_column"]: m["target_column"] for m in result["mappings"]} == {
        "BudgetUSD": "budget", "Global_BoxOfficeUSD": "revenue",
        "Genre": "genre", "ReleaseDate": "release_date",
    }


def test_mapping_conflict():
    with pytest.raises(ValueError):
        validate_mapping({"mappings": [{"source_column": "A", "target_column": "budget"}, {"source_column": "B", "target_column": "budget"}]}, ["A", "B"])


def test_standardization_requires_target(tmp_path):
    source = tmp_path / "data.csv"
    pd.DataFrame({"Production Cost": range(20), "Film Category": ["Drama"] * 20, "Production Days": range(20)}).to_csv(source, index=False)
    mapping = {"mappings": [{"source_column": a, "target_column": b} for a, b in [("Production Cost", "budget"), ("Film Category", "genre"), ("Production Days", "planned_duration")]]}
    with pytest.raises(ValueError, match="revenue"):
        standardize(source, mapping, tmp_path / "out.csv")


def test_profile(tmp_path):
    source = tmp_path / "data.csv"
    pd.DataFrame({"A": [1, 1, None], "B": ["x", "x", "z"]}).to_csv(source, index=False)
    result = profile(source, "sample")
    assert result["duplicate_rows"] == 1
    assert result["columns"][0]["null_count"] == 1

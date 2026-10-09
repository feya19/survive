import json
from pathlib import Path
import papermill as pm
from .base import TrainingAdapter
from app.pipeline import read_dataset


class LightGBMNotebookTrainingAdapter(TrainingAdapter):
    model_type = "lgbm_revenue"
    target = "revenue"
    notebook = Path(__file__).resolve().parents[3] / "notebooks" / "lgbm_training.ipynb"

    def validate_dataset(self, dataset_path: Path, config: dict) -> None:
        data = read_dataset(dataset_path, 10)
        required = {"budget", "genre", self.target}
        if not required.issubset(data.columns):
            raise ValueError(f"Missing LightGBM training fields: {sorted(required - set(data.columns))}")

    def train(self, dataset_path: Path, config: dict, output_dir: Path) -> None:
        pm.execute_notebook(
            str(self.notebook), str(output_dir / "executed_notebook.ipynb"),
            parameters={
                "dataset_path": str(dataset_path), "target_column": self.target,
                "output_dir": str(output_dir), "dataset_version_id": config["dataset_version_id"],
                "random_seed": int(config.get("random_seed", 42)),
                "currency": config.get("currency", "USD"),
                "project_root": str(self.notebook.resolve().parents[1]),
            },
            kernel_name="python3", cwd=str(output_dir),
        )

    def evaluate(self, output_dir: Path) -> dict:
        return json.loads((output_dir / "metrics.json").read_text())

    def export_artifacts(self, output_dir: Path) -> dict:
        return json.loads((output_dir / "manifest.json").read_text())

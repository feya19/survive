from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


class TrainingAdapter(ABC):
    model_type: str
    target: str

    @abstractmethod
    def validate_dataset(self, dataset_path: Path, config: dict) -> None: ...

    @abstractmethod
    def train(self, dataset_path: Path, config: dict, output_dir: Path) -> None: ...

    @abstractmethod
    def evaluate(self, output_dir: Path) -> dict: ...

    @abstractmethod
    def export_artifacts(self, output_dir: Path) -> dict: ...

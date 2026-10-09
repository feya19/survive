import re
from collections.abc import Iterable

import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin


_SPLIT = re.compile(r"[,|/;&]+")


def parse_genres(value: object) -> list[str]:
    if isinstance(value, (list, tuple, set, np.ndarray)):
        raw = list(value)
    elif isinstance(value, str):
        raw = _SPLIT.split(value)
    else:
        raise ValueError("Genre must be a string or an array of strings")

    genres = []
    seen = set()
    for item in raw:
        if not isinstance(item, str):
            raise ValueError("Every genre must be a string")
        label = item.strip()
        key = label.casefold()
        if not key or key in seen:
            continue
        genres.append(label)
        seen.add(key)
    if not genres:
        raise ValueError("At least one genre is required")
    return genres


def canonical_genre(value: str, vocabulary: Iterable[str]) -> str | None:
    lookup = {name.casefold(): name for name in vocabulary}
    return lookup.get(value.strip().casefold())


class MultiHotGenreEncoder(BaseEstimator, TransformerMixin):
    """Encode scalar or delimited training labels and genre arrays identically."""

    def __init__(self, categories: list[str] | None = None):
        self.categories = categories

    def fit(self, X, y=None):
        values = np.asarray(X, dtype=object).reshape(-1)
        if self.categories is None:
            vocabulary = []
            seen = set()
            for value in values:
                for label in parse_genres(value):
                    if label.casefold() not in seen:
                        vocabulary.append(label)
                        seen.add(label.casefold())
        else:
            vocabulary = list(self.categories)
        if not vocabulary:
            raise ValueError("Training data must contain at least one genre")
        if len({name.casefold() for name in vocabulary}) != len(vocabulary):
            raise ValueError("Genre vocabulary contains duplicate categories")
        self.categories_ = np.asarray(vocabulary, dtype=object)
        self._lookup = {name.casefold(): index for index, name in enumerate(vocabulary)}
        return self

    def transform(self, X):
        if not hasattr(self, "categories_"):
            raise ValueError("Genre encoder has not been fitted")
        rows = np.asarray(X, dtype=object).reshape(-1)
        result = np.zeros((len(rows), len(self.categories_)), dtype=np.float32)
        for row_index, value in enumerate(rows):
            for label in parse_genres(value):
                index = self._lookup.get(label.casefold())
                if index is None:
                    raise ValueError(f"Unsupported genre: {label}")
                result[row_index, index] = 1.0
        return result

    def get_feature_names_out(self, input_features=None):
        return np.asarray([f"genre_{name}" for name in self.categories_], dtype=object)

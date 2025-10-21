from __future__ import annotations

from typing import Iterable, Protocol, Any
from datetime import date
from dataclasses import dataclass


@dataclass
class AdapterMetadata:
    """Metadata and capabilities for a data source adapter"""
    name: str
    category: str  # "news", "prices", "macro", etc.
    supports_historical: bool = False  # Can fetch historical data with date ranges
    description: str = ""


class SourceAdapter(Protocol):
    def name(self) -> str: ...
    def fetch(self, params: dict[str, Any]) -> Iterable[dict]: ...  # raw records
    def normalize(self, raw: dict) -> Any: ...  # returns pydantic model
    def sink(self, models: Iterable[Any], partition_dt: date) -> dict: ...


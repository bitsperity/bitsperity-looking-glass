from __future__ import annotations

import os
from typing import List
from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """Abstract base for embedding providers."""
    
    @abstractmethod
    def embed(self, text: str, is_query: bool = False) -> List[float]:
        """Embed single text. For e5-family models, use is_query=True for search queries."""
        pass
    
    @abstractmethod
    def embed_batch(self, texts: List[str], is_query: bool = False) -> List[List[float]]:
        """Embed batch of texts. For e5-family models, use is_query=True for search queries."""
        pass


def get_embedding_provider(
    provider_type: str = "local", 
    model_name: str | None = None,
    device: str | None = None
) -> EmbeddingProvider:
    """Factory for embedding providers."""
    if provider_type == "local":
        from libs.manifold_core.embeddings.local_hf import LocalHuggingFaceEmbeddings
        return LocalHuggingFaceEmbeddings(
            model_name=model_name or "mixedbread-ai/mxbai-embed-large-v1",
            device=device
        )
    else:
        raise ValueError(f"Unknown provider: {provider_type}")



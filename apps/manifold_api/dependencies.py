# apps/manifold_api/dependencies.py
"""Dependency injection for Manifold API."""
from __future__ import annotations

import os
from libs.manifold_core.storage.qdrant_store import QdrantStore
from libs.manifold_core.embeddings.provider import get_embedding_provider, EmbeddingProvider

_qdrant_store = None
_embedding_provider = None


def get_qdrant_store() -> QdrantStore:
    global _qdrant_store
    if not _qdrant_store:
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        collection_name = os.getenv("MANIFOLD_QDRANT_COLLECTION", "manifold_thoughts")
        _qdrant_store = QdrantStore(qdrant_url=qdrant_url, collection_name=collection_name)
        _qdrant_store.initialize_collection()
    return _qdrant_store


def get_embedding_provider_dep() -> EmbeddingProvider:
    global _embedding_provider
    if not _embedding_provider:
        provider_type = os.getenv("MANIFOLD_EMBED_PROVIDER", "local")
        model_name = os.getenv("MANIFOLD_EMBED_MODEL", "mixedbread-ai/mxbai-embed-large-v1")
        device = os.getenv("MANIFOLD_EMBED_DEVICE", None)  # None = auto-detect (cuda if available)
        _embedding_provider = get_embedding_provider(provider_type, model_name, device=device)
    return _embedding_provider


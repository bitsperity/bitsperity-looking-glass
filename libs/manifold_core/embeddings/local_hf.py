from __future__ import annotations

from typing import List
from sentence_transformers import SentenceTransformer
import torch
from libs.manifold_core.embeddings.provider import EmbeddingProvider


class LocalHuggingFaceEmbeddings(EmbeddingProvider):
    """Local Hugging Face embeddings via sentence-transformers.
    
    Supports Query/Passage prefixes for e5-family models (improves search quality).
    Models that benefit from prefixes: intfloat/e5-*, intfloat/multilingual-e5-*
    """
    
    def __init__(self, model_name: str = "mixedbread-ai/mxbai-embed-large-v1", device: str | None = None):
        self.model = SentenceTransformer(
            model_name, 
            device=device or ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model_name = model_name
        # Detect if this is an e5-family model (needs query/passage prefixes)
        self._is_e5_model = "e5" in model_name.lower() or "multilingual-e5" in model_name.lower()

    def embed(self, text: str, is_query: bool = False) -> List[float]:
        """Embed single text. For e5 models, use is_query=True for search queries."""
        if self._is_e5_model:
            prefix = "query: " if is_query else "passage: "
            text = f"{prefix}{text}"
        return self.model.encode([text], normalize_embeddings=True, convert_to_numpy=True)[0].tolist()

    def embed_batch(self, texts: List[str], is_query: bool = False) -> List[List[float]]:
        """Embed batch of texts. For e5 models, use is_query=True for search queries."""
        if self._is_e5_model:
            prefix = "query: " if is_query else "passage: "
            texts = [f"{prefix}{t}" for t in texts]
        return self.model.encode(texts, normalize_embeddings=True, convert_to_numpy=True).tolist()



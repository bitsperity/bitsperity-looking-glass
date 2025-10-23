from __future__ import annotations

from typing import List
from sentence_transformers import SentenceTransformer
import torch
from libs.manifold_core.embeddings.provider import EmbeddingProvider


class LocalHuggingFaceEmbeddings(EmbeddingProvider):
    """Local Hugging Face embeddings via sentence-transformers."""
    
    def __init__(self, model_name: str = "mixedbread-ai/mxbai-embed-large-v1", device: str | None = None):
        self.model = SentenceTransformer(
            model_name, 
            device=device or ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model_name = model_name

    def embed(self, text: str) -> List[float]:
        """Embed single text."""
        return self.model.encode([text], normalize_embeddings=True, convert_to_numpy=True)[0].tolist()

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed batch of texts."""
        return self.model.encode(texts, normalize_embeddings=True, convert_to_numpy=True).tolist()



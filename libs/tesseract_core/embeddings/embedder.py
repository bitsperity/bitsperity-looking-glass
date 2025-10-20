from sentence_transformers import SentenceTransformer
import torch

class Embedder:
    def __init__(self, model_name: str = "BAAI/bge-large-en-v1.5", device: str = "cuda"):
        self.model = SentenceTransformer(model_name)
        self.model.to(device)
        if device == "cuda":
            self.model.half()  # FP16 for speed
    
    def encode(self, texts: str | list[str], batch_size: int = 128, normalize: bool = True):
        if isinstance(texts, str):
            texts = [texts]
        return self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=normalize,
            show_progress_bar=len(texts) > 100
        )


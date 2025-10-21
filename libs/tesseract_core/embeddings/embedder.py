from sentence_transformers import SentenceTransformer
import torch
import os

class Embedder:
    def __init__(self, model_name: str = "BAAI/bge-large-en-v1.5", device: str = None):
        if device is None:
            device = os.getenv("TESSERACT_DEVICE", "cpu")
        
        self.device = device
        self.model = SentenceTransformer(model_name)
        
        # Try GPU, fallback to CPU
        if device == "cuda":
            try:
                self.model.to(device)
                self.model.half()  # FP16 for speed
                print(f"✓ Using GPU acceleration (CUDA)")
            except Exception as e:
                print(f"✗ GPU failed ({e}), falling back to CPU")
                self.device = "cpu"
                self.model.to("cpu")
        else:
            self.model.to("cpu")
            print(f"✓ Using CPU")
    
    def encode(self, texts: str | list[str], batch_size: int = 128, normalize: bool = True):
        if isinstance(texts, str):
            texts = [texts]
        return self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=normalize,
            show_progress_bar=len(texts) > 100
        )


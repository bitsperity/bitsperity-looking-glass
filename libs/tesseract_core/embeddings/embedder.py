from sentence_transformers import SentenceTransformer
import torch
import os

class Embedder:
    def __init__(self, model_name: str = "intfloat/multilingual-e5-large", device: str = None):
        if device is None:
            device = os.getenv("TESSERACT_DEVICE", "cpu")
        
        self.device = device
        # Reduce thread pressure and tokenizer parallelism to avoid system hangs
        os.environ["TOKENIZERS_PARALLELISM"] = "false"
        try:
            torch.set_num_threads(int(os.getenv("OMP_NUM_THREADS", "2")))
            torch.set_num_interop_threads(int(os.getenv("MKL_NUM_THREADS", "2")))
        except Exception:
            # Not critical if unavailable on this platform
            pass
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
    
    def encode(self, texts: str | list[str], batch_size: int = 128, normalize: bool = True, is_query: bool = False):
        if isinstance(texts, str):
            texts = [texts]

        # e5-family models perform best with explicit prefixes
        prefix = "query: " if is_query else "passage: "
        prefixed = [f"{prefix}{t}" for t in texts]

        return self.model.encode(
            prefixed,
            batch_size=batch_size,
            normalize_embeddings=normalize,
            show_progress_bar=False,
            convert_to_numpy=True,
            device=self.device,
        )


# Manifold Environment Variables

## Embedding Configuration

### `MANIFOLD_EMBED_DEVICE`
**Default:** `None` (auto-detect: uses CUDA if available, otherwise CPU)

Controls which device to use for embedding computation:
- `cuda` - Force GPU acceleration (requires NVIDIA GPU + CUDA)
- `cpu` - Force CPU computation
- `None` or empty - Auto-detect (recommended)

**Example:**
```bash
# Force GPU (fastest, requires NVIDIA GPU)
MANIFOLD_EMBED_DEVICE=cuda

# Force CPU (slower but works everywhere)
MANIFOLD_EMBED_DEVICE=cpu

# Auto-detect (recommended)
# MANIFOLD_EMBED_DEVICE=
```

### `MANIFOLD_EMBED_MODEL`
**Default:** `mixedbread-ai/mxbai-embed-large-v1`

The Hugging Face model to use for embeddings. Must be compatible with sentence-transformers.

**Recommended models for 4070 GPU:**
- `mixedbread-ai/mxbai-embed-large-v1` (1024 dims, excellent quality) ✅ Current
- `BAAI/bge-large-en-v1.5` (1024 dims, strong performance)
- `intfloat/e5-large-v2` (1024 dims, multilingual)

**Example:**
```bash
MANIFOLD_EMBED_MODEL=mixedbread-ai/mxbai-embed-large-v1
```

### `MANIFOLD_EMBED_PROVIDER`
**Default:** `local`

The embedding provider type:
- `local` - Local Hugging Face models (recommended)
- Future: `openai`, `cohere`, etc.

**Example:**
```bash
MANIFOLD_EMBED_PROVIDER=local
```

## Storage Configuration

### `QDRANT_URL`
**Default:** `http://localhost:6333`

URL of the Qdrant vector database.

**Example:**
```bash
QDRANT_URL=http://localhost:6333
```

### `MANIFOLD_QDRANT_COLLECTION`
**Default:** `manifold_thoughts`

The Qdrant collection name for Manifold thoughts.

**Example:**
```bash
MANIFOLD_QDRANT_COLLECTION=manifold_thoughts
```

## GPU Configuration in Docker Compose

To enable GPU acceleration in Docker:

```yaml
manifold-api:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

**Requirements:**
1. NVIDIA GPU with CUDA support
2. NVIDIA Docker runtime installed
3. `nvidia-docker2` package

**Verify GPU is available:**
```bash
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

## Performance Comparison

| Device | Model | Speed (embeddings/sec) | Notes |
|--------|-------|----------------------|-------|
| RTX 4070 | mxbai-embed-large | ~5000 | **Recommended** |
| CPU (16-core) | mxbai-embed-large | ~200 | 25x slower |

**For production with 4070 GPU, always use:**
```bash
MANIFOLD_EMBED_DEVICE=cuda
```


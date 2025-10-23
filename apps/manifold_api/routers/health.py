from __future__ import annotations

import os
import torch
from fastapi import APIRouter, Depends
from libs.manifold_core.models.responses import HealthResponse, ConfigResponse
from libs.manifold_core.storage.qdrant_store import QdrantStore
from libs.manifold_core.embeddings.provider import EmbeddingProvider
from apps.manifold_api.dependencies import get_qdrant_store, get_embedding_provider_dep

router = APIRouter(prefix="/v1/memory", tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep)
):
    """Check Manifold API health and Qdrant connection."""
    qdrant_ok = False
    try:
        info = store.client.get_collection(store.collection_name)
        qdrant_ok = True
    except:
        pass
    
    return HealthResponse(
        status="ok" if qdrant_ok else "degraded",
        qdrant_connected=qdrant_ok,
        collection_name=store.collection_name,
        embedding_model=getattr(embedder, 'model_name', 'unknown')
    )


@router.get("/config", response_model=ConfigResponse)
def config(
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep)
):
    """Get Manifold configuration."""
    return ConfigResponse(
        status="ok",
        collection_name=store.collection_name,
        vector_dim=store.vector_dim,
        embedding_provider=type(embedder).__name__
    )


@router.get("/device")
def device_info(embedder: EmbeddingProvider = Depends(get_embedding_provider_dep)):
    """Get detailed device and GPU information."""
    cuda_available = torch.cuda.is_available()
    
    device_info = {
        "status": "ok",
        "cuda_available": cuda_available,
        "device_config": os.getenv("MANIFOLD_EMBED_DEVICE", "auto-detect"),
        "pytorch_version": torch.__version__,
    }
    
    if cuda_available:
        device_info.update({
            "gpu_name": torch.cuda.get_device_name(0),
            "gpu_memory_total_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 2),
            "gpu_memory_allocated_gb": round(torch.cuda.memory_allocated(0) / 1e9, 2),
            "gpu_memory_reserved_gb": round(torch.cuda.memory_reserved(0) / 1e9, 2),
            "cuda_version": torch.version.cuda,
            "cudnn_version": torch.backends.cudnn.version(),
        })
        
        # Get actual device from embedder if available
        if hasattr(embedder, 'model') and hasattr(embedder.model, 'device'):
            device_info["model_device"] = str(embedder.model.device)
    else:
        device_info["gpu_name"] = None
        device_info["model_device"] = "cpu"
    
    return device_info

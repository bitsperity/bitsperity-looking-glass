from __future__ import annotations

import os
import logging
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.manifold_api.routers.thoughts import router as thoughts_router
from apps.manifold_api.routers.health import router as health_router
from apps.manifold_api.routers import search, relations, promote, admin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Manifold API", version="0.1.0")

# Enable CORS for frontend (dev mode - allow all origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Log system information on startup."""
    logger.info("=" * 60)
    logger.info("🚀 MANIFOLD API STARTING")
    logger.info("=" * 60)
    
    # Device info
    cuda_available = torch.cuda.is_available()
    device = os.getenv("MANIFOLD_EMBED_DEVICE", "auto-detect")
    
    if cuda_available:
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
        logger.info(f"✅ GPU DETECTED: {gpu_name}")
        logger.info(f"   GPU Memory: {gpu_memory:.1f} GB")
        logger.info(f"   CUDA Version: {torch.version.cuda}")
    else:
        logger.info("⚠️  NO GPU DETECTED - Using CPU")
    
    logger.info(f"   Device Config: {device}")
    
    # Model info
    model_name = os.getenv("MANIFOLD_EMBED_MODEL", "mixedbread-ai/mxbai-embed-large-v1")
    collection = os.getenv("MANIFOLD_QDRANT_COLLECTION", "manifold_thoughts")
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    
    logger.info(f"📦 Embedding Model: {model_name}")
    logger.info(f"🗄️  Qdrant Collection: {collection}")
    logger.info(f"🔗 Qdrant URL: {qdrant_url}")
    logger.info("=" * 60)


app.include_router(health_router)
app.include_router(thoughts_router)
app.include_router(search.router)
app.include_router(relations.router)
app.include_router(promote.router)
app.include_router(admin.router)



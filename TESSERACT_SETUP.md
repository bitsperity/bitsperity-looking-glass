# Tesseract Setup Guide

Tesseract ist das Semantic Intelligence Layer für LookingGlass. Es ermöglicht semantische Suche über den Satbase News-Corpus.

## Voraussetzungen

- Docker & Docker Compose
- CUDA 11.8+ (für GPU-Beschleunigung)
- Python 3.10+
- Mindestens 12GB VRAM (für bge-large mit 4070)

## Installation

### 1. Dependencies installieren

```bash
pip install -r requirements.txt
```

Dies installiert:
- `sentence-transformers>=2.3.0` (Embedding-Modell)
- `qdrant-client>=1.7.0` (Vector DB Client)
- `torch>=2.0.0` (PyTorch mit CUDA-Support)

### 2. Qdrant starten

```bash
docker-compose up -d qdrant
```

Qdrant läuft auf:
- REST API: `http://localhost:6333`
- gRPC: `http://localhost:6334`
- Web UI: `http://localhost:6333/dashboard`

Überprüfen:
```bash
curl http://localhost:6333/health
```

### 3. Initial Batch Embedding

**Wichtig:** Stelle sicher, dass Satbase läuft und News-Daten vorhanden sind!

```bash
# Satbase sollte laufen
curl http://localhost:8080/v1/news?from=2025-10-01&to=2025-10-19&limit=1

# Batch Embedding starten (dauert ~5 Minuten für 50K Artikel)
python -m apps.tesseract_api.batch_embed
```

**Was passiert:**
1. Lädt alle News aus Satbase (2020-heute)
2. Generiert 1024D Embeddings mit bge-large (GPU-beschleunigt)
3. Speichert Vektoren in Qdrant Collection `news_embeddings`
4. Batch-Verarbeitung: 1000 Artikel pro Upsert

**Expected Output:**
```
Initializing Tesseract batch embedding...
Created Qdrant collection: news_embeddings
Fetching news from Satbase...
Fetched 52341 articles from Satbase
Generating embeddings (GPU accelerated)...
Generated 52341 embeddings
Storing embeddings in Qdrant...
Stored batch 1/53
Stored batch 2/53
...
Successfully embedded 52341 news articles!
Tesseract is ready for semantic search.
```

**GPU Monitoring:**
```bash
# In separatem Terminal
watch -n 1 nvidia-smi
```

### 4. Tesseract API starten

```bash
docker-compose up -d tesseract-api
```

Tesseract API läuft auf: `http://localhost:8081`

**Logs anschauen:**
```bash
docker-compose logs -f tesseract-api
```

### 5. Smoke Test

```bash
./scripts/tesseract_smoke.sh
```

**Tests:**
1. Health Check
2. Semantic Search
3. Find Similar Articles

## API Endpoints

### POST `/v1/tesseract/search`

Semantische Suche über News-Corpus.

**Request:**
```json
{
  "query": "semiconductor supply chain constraints Taiwan",
  "filters": {
    "tickers": ["NVDA", "TSM"],
    "from": "2025-10-01",
    "to": "2025-10-19"
  },
  "limit": 20
}
```

**Response:**
```json
{
  "query": "semiconductor supply chain constraints Taiwan",
  "count": 18,
  "results": [
    {
      "id": "abc123",
      "score": 0.87,
      "title": "TSMC reports 5nm capacity at 95%",
      "text": "Taiwan Semiconductor Manufacturing...",
      "source": "gdelt",
      "url": "https://...",
      "published_at": "2025-10-15T14:30:00Z",
      "tickers": ["TSM", "NVDA"]
    }
  ]
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8081/v1/tesseract/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI chip shortage impact",
    "filters": {"tickers": ["NVDA"]},
    "limit": 10
  }' | jq
```

### GET `/v1/tesseract/similar/{news_id}`

Findet ähnliche Artikel zu einem gegebenen Artikel.

**Request:**
```bash
curl http://localhost:8081/v1/tesseract/similar/abc123?limit=5 | jq
```

**Response:**
```json
{
  "source_article": {
    "id": "abc123",
    "title": "TSMC capacity constraints",
    ...
  },
  "similar_articles": [
    {
      "id": "def456",
      "score": 0.91,
      "title": "Chip shortage affects auto",
      ...
    }
  ]
}
```

## Frontend (LookingGlass)

### Zugriff

Navigiere zu: `http://localhost:3000/tesseract`

### Features

- **Semantic Search Bar**: Natural Language Queries
- **Filter**: Tickers, Datumsbereich
- **Results**: News Cards mit Similarity Score
- **Expandable Content**: Full article text/HTML

### Environment Variables

```bash
# apps/looking_glass/.env
VITE_API_BASE=http://127.0.0.1:8080
VITE_TESSERACT_BASE=http://127.0.0.1:8081
```

## Troubleshooting

### Problem: "Collection already exists"

**Lösung:** Collection löschen und neu erstellen:
```python
from qdrant_client import QdrantClient
client = QdrantClient(host="localhost", port=6333)
client.delete_collection("news_embeddings")
```

### Problem: CUDA Out of Memory

**Lösungen:**
1. Reduce batch size in `batch_embed.py`: `batch_size=64` (statt 128)
2. Use CPU: `Embedder(device="cpu")` (langsamer, aber kein VRAM)
3. Use smaller model: `bge-base-en-v1.5` (768D statt 1024D)

### Problem: Slow Search

**Ursachen:**
1. HNSW Index nicht erstellt → Qdrant Collection Check
2. Zu viele Filter → Reduce filter complexity
3. CPU statt GPU → Check `nvidia-smi`

**Lösung - HNSW Index optimieren:**
```python
from qdrant_client import QdrantClient
from qdrant_client.models import OptimizersConfigDiff

client = QdrantClient(host="localhost", port=6333)
client.update_collection(
    collection_name="news_embeddings",
    optimizer_config=OptimizersConfigDiff(
        indexing_threshold=10000  # Build index after 10K vectors
    )
)
```

### Problem: No GPU found

**Check:**
```bash
nvidia-smi
python -c "import torch; print(torch.cuda.is_available())"
```

**Fix:** Install PyTorch with CUDA:
```bash
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

## Incremental Updates

Für tägliche News-Updates (ohne Full Re-Embedding):

```python
# apps/tesseract_api/incremental_embed.py (TODO)
# 1. Fetch new news from Satbase (since last run)
# 2. Generate embeddings
# 3. Upsert to Qdrant (automatically merges)
```

## Performance Metrics

**Expected with 4070:**
- Embedding Speed: ~1000 articles/sec
- Search Latency: <50ms (HNSW indexed)
- Memory: ~2GB RAM for 50K vectors (with quantization)
- VRAM: ~2.5GB (model in FP16)

**Validation:**
```bash
# Check collection stats
curl http://localhost:6333/collections/news_embeddings | jq
```

## Architecture

```
┌─────────────────────────────────────────┐
│          Satbase (Sub1)                 │
│    Raw News Data (Parquet)              │
└────────────┬────────────────────────────┘
             │
             │ HTTP GET /v1/news
             │
┌────────────▼────────────────────────────┐
│     Tesseract Batch Processor           │
│  - Read news from Satbase               │
│  - Generate embeddings (GPU)            │
│  - Store in Qdrant                      │
└────────────┬────────────────────────────┘
             │
             │ Qdrant Client
             │
┌────────────▼────────────────────────────┐
│        Qdrant Vector DB                 │
│  Collection: news_embeddings            │
│  - 1024D vectors (bge-large)            │
│  - HNSW index (cosine similarity)       │
│  - Metadata: title, text, tickers, etc  │
└────────────┬────────────────────────────┘
             │
             │ REST API
             │
┌────────────▼────────────────────────────┐
│      Tesseract API (FastAPI)            │
│  - POST /v1/tesseract/search            │
│  - GET  /v1/tesseract/similar/{id}      │
└────────────┬────────────────────────────┘
             │
             │ HTTP + WebSocket
             │
┌────────────▼────────────────────────────┐
│     LookingGlass Frontend               │
│  - Semantic search UI                   │
│  - News cards with similarity scores    │
└─────────────────────────────────────────┘
```

## Next Steps (Sub3 - Knowledge Graph)

Tesseract liefert die Grundlage für Sub3:
- Named Entity Recognition (spaCy)
- Entity Extraction aus News
- Relationship Mapping
- Temporal Knowledge Graph
- Causal Reasoning

Stay tuned! 🚀


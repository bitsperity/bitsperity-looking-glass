from fastapi import APIRouter
from libs.tesseract_core.models.search import SearchRequest, SearchResponse, SearchResult
from libs.tesseract_core.embeddings.embedder import Embedder
from libs.tesseract_core.storage.vector_store import VectorStore

router = APIRouter()

# Initialize once at startup (device from TESSERACT_DEVICE env var)
embedder = None
vector_store = VectorStore()

def get_embedder():
    global embedder
    if embedder is None:
        embedder = Embedder()  # Device from env
    return embedder

@router.post("/tesseract/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    # Generate query embedding
    emb = get_embedder()
    query_embedding = emb.encode(request.query, normalize=True)[0]
    
    # Build Qdrant filter
    qdrant_filter = build_filter(request.filters) if request.filters else None
    
    # Search
    results = vector_store.search(
        query_vector=query_embedding.tolist(),
        limit=request.limit,
        query_filter=qdrant_filter
    )
    
    # Format response
    return SearchResponse(
        query=request.query,
        count=len(results),
        results=[
            SearchResult(
                id=r.id,
                score=r.score,
                **r.payload
            )
            for r in results
        ]
    )

def build_filter(filters: dict):
    must_conditions = []
    if filters.get("tickers"):
        must_conditions.append({
            "key": "tickers",
            "match": {"any": filters["tickers"]}
        })
    if filters.get("from") or filters.get("to"):
        range_filter = {}
        if filters.get("from"):
            range_filter["gte"] = filters["from"]
        if filters.get("to"):
            range_filter["lte"] = filters["to"]
        must_conditions.append({
            "key": "published_at",
            "range": range_filter
        })
    return {"must": must_conditions} if must_conditions else None

@router.get("/tesseract/similar/{news_id}")
async def find_similar(news_id: str, limit: int = 10):
    source = vector_store.client.retrieve(
        collection_name=vector_store.collection_name,
        ids=[news_id]
    )[0]
    
    results = vector_store.search(
        query_vector=source.vector,
        limit=limit + 1
    )
    
    # Exclude source article
    results = [r for r in results if r.id != news_id][:limit]
    
    return {
        "source_article": {"id": news_id, **source.payload},
        "similar_articles": [
            {"id": r.id, "score": r.score, **r.payload}
            for r in results
        ]
    }


#!/usr/bin/env python3
"""
Batch embed all news from Satbase into Tesseract vector store.
Run once initially, then use incremental updates.
"""
import sys
import httpx
from libs.tesseract_core.embeddings.embedder import Embedder
from libs.tesseract_core.storage.vector_store import VectorStore
from qdrant_client.models import PointStruct

def main():
    print("Initializing Tesseract batch embedding...")
    
    # 1. Initialize
    embedder = Embedder()
    vector_store = VectorStore()
    
    # 2. Create collection
    try:
        vector_store.create_collection(vector_size=1024)
        print("Created Qdrant collection: news_embeddings")
    except Exception as e:
        print(f"Collection already exists or error: {e}")
    
    # 3. Fetch all news from Satbase
    print("Fetching news from Satbase...")
    satbase_url = "http://localhost:8080/v1/news"
    
    with httpx.Client(timeout=300.0) as client:
        response = client.get(satbase_url, params={
            "from": "2020-01-01",
            "to": "2025-12-31",
            "limit": 100000
        })
        news_items = response.json()["items"]
    
    print(f"Fetched {len(news_items)} articles from Satbase")
    
    # 4. Generate embeddings
    print("Generating embeddings (GPU accelerated)...")
    texts = [f"{item['title']}. {item['text']}" for item in news_items]
    embeddings = embedder.encode(texts, batch_size=128)
    
    print(f"Generated {len(embeddings)} embeddings")
    
    # 5. Prepare points
    points = [
        PointStruct(
            id=item["id"],
            vector=embedding.tolist(),
            payload={
                "title": item["title"],
                "text": item["text"],
                "source": item["source"],
                "url": item["url"],
                "published_at": item["published_at"],
                "tickers": item.get("tickers", [])
            }
        )
        for item, embedding in zip(news_items, embeddings)
    ]
    
    # 6. Upsert to Qdrant
    print("Storing embeddings in Qdrant...")
    batch_size = 1000
    for i in range(0, len(points), batch_size):
        batch = points[i:i+batch_size]
        vector_store.upsert(batch, wait=True)
        print(f"Stored batch {i//batch_size + 1}/{(len(points) + batch_size - 1)//batch_size}")
    
    print(f"Successfully embedded {len(points)} news articles!")
    print("Tesseract is ready for semantic search.")

if __name__ == "__main__":
    main()


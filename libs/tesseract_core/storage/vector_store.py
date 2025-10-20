from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import os

class VectorStore:
    def __init__(self, host: str = None, port: int = 6333):
        self.host = host or os.getenv("QDRANT_HOST", "localhost")
        self.port = port
        self.client = QdrantClient(host=self.host, port=self.port)
        self.collection_name = "news_embeddings"
    
    def create_collection(self, vector_size: int = 1024):
        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
        )
    
    def upsert(self, points: list[PointStruct], wait: bool = True):
        return self.client.upsert(
            collection_name=self.collection_name,
            points=points,
            wait=wait
        )
    
    def search(self, query_vector: list[float], limit: int = 20, query_filter=None):
        return self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=limit,
            with_payload=True
        )


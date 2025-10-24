from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import os

class VectorStore:
    def __init__(self, host: str = None, port: int = 6333, collection_name: str | None = None):
        self.host = host or os.getenv("QDRANT_HOST", "localhost")
        self.port = port
        self.client = QdrantClient(host=self.host, port=self.port)
        # Default logical alias; can be switched to different physical collections
        self.collection_name = collection_name or "news_embeddings"
    
    def create_collection(self, vector_size: int = 1024, name: str | None = None):
        target = name or self.collection_name
        self.client.create_collection(
            collection_name=target,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
        )

    def delete_collection(self, name: str):
        return self.client.delete_collection(collection_name=name)

    def list_collections(self):
        return self.client.get_collections()

    def get_collection(self, name: str | None = None):
        target = name or self.collection_name
        return self.client.get_collection(collection_name=target)

    def create_alias(self, alias: str, collection_name: str):
        """Create or update an alias to point to a collection"""
        return self.client.update_collection_aliases(
            change_aliases_operations=[
                {
                    "create_alias": {
                        "collection_name": collection_name,
                        "alias_name": alias
                    }
                }
            ]
        )

    def delete_alias(self, alias: str):
        """Delete an alias"""
        return self.client.update_collection_aliases(
            change_aliases_operations=[
                {
                    "delete_alias": {
                        "alias_name": alias
                    }
                }
            ]
        )

    def use_collection(self, name: str):
        self.collection_name = name
    
    def upsert(self, points: list[PointStruct], wait: bool = True, name: str | None = None):
        target = name or self.collection_name
        return self.client.upsert(
            collection_name=target,
            points=points,
            wait=wait
        )
    
    def search(self, query_vector: list[float], limit: int = 20, query_filter=None, name: str | None = None):
        target = name or self.collection_name
        return self.client.search(
            collection_name=target,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=limit,
            with_payload=True
        )


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
    
    def ensure_collection(self, vector_size: int = 1024, alias: str = "news_embeddings"):
        """Ensure collection and alias exist; create if missing"""
        try:
            # Check if alias exists and points to a collection
            collections_response = self.client.get_collections()
            existing_collections = [col.name for col in collections_response.collections]
            
            # Try to get collection via alias
            try:
                self.client.get_collection(collection_name=alias)
                print(f"✓ Collection alias '{alias}' exists and is active")
                return
            except Exception:
                pass  # Alias doesn't exist yet
            
            # Find a suitable physical collection to use
            if existing_collections:
                # Use first existing collection
                target_collection = existing_collections[0]
                print(f"Using existing collection: {target_collection}")
            else:
                # Create new versioned collection
                import time
                target_collection = f"news_embeddings_v{int(time.time())}"
                print(f"Creating new collection: {target_collection}")
                self.create_collection(vector_size=vector_size, name=target_collection)
            
            # Create alias (or update if exists)
            try:
                self.delete_alias(alias=alias)
            except Exception:
                pass  # Alias didn't exist
            
            self.create_alias(alias=alias, collection_name=target_collection)
            self.use_collection(alias)
            print(f"✓ Alias '{alias}' now points to '{target_collection}'")
            
        except Exception as e:
            print(f"✗ Failed to ensure collection: {e}")
            raise

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

    def delete_by_filter(self, query_filter: dict, name: str | None = None):
        """Delete points matching a payload filter."""
        target = name or self.collection_name
        return self.client.delete(
            collection_name=target,
            points_selector={"filter": query_filter},
            wait=True,
        )

    def scroll(self, query_filter: dict | None = None, limit: int = 100, with_payload: bool = True, with_vectors: bool = False, name: str | None = None):
        """Scroll through points matching a filter."""
        target = name or self.collection_name
        points, next_page_offset = self.client.scroll(
            collection_name=target,
            scroll_filter=query_filter,
            limit=limit,
            with_payload=with_payload,
            with_vectors=with_vectors,
        )
        return points, next_page_offset


"""
Ariadne FastAPI Application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from libs.ariadne_core.storage import GraphStore

# Global graph store instance
graph_store: GraphStore | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for Neo4j connection"""
    global graph_store
    
    # Startup
    print("🚀 Initializing Ariadne Knowledge Graph...")
    graph_store = GraphStore()
    graph_store.connect()
    
    if graph_store.verify_connection():
        print("✓ Neo4j connection established")
        graph_store.initialize_schema()
        print("✓ Schema initialized")
    else:
        print("✗ Failed to connect to Neo4j")
    
    yield
    
    # Shutdown
    if graph_store:
        graph_store.close()
        print("✓ Neo4j connection closed")


app = FastAPI(
    title="ARIADNE API",
    version="0.1.0",
    description="Knowledge Graph for Trading Intelligence",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_graph_store() -> GraphStore:
    """Dependency for graph store"""
    if graph_store is None:
        raise RuntimeError("Graph store not initialized")
    return graph_store


# Import routers (after get_graph_store definition to avoid circular import)
from .routers import health, read, write, learn, ingest, validate, admin, suggestions

# Register routers
app.include_router(health.router, prefix="")
app.include_router(read.router, prefix="/v1/kg")
app.include_router(write.router, prefix="/v1/kg")
app.include_router(learn.router, prefix="/v1/kg/learn")
app.include_router(validate.router, prefix="/v1/kg/validate")
app.include_router(admin.router, prefix="")  # Admin endpoints for graph maintenance
app.include_router(ingest.router, prefix="")
app.include_router(suggestions.router, prefix="")


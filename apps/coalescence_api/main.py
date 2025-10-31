from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import time
import logging

from .routers import health, agents, context, insights, messages, tools

# Configure logging
logger = logging.getLogger(__name__)

app = FastAPI(title="COALESCENCE API", version="0.1.0")

# CORS for LookingGlass frontend (development-friendly)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Performance logging middleware
class PerformanceLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        duration_ms = (time.time() - start_time) * 1000
        
        # Log slow requests (>100ms)
        if duration_ms > 100:
            logger.warning(
                f"SLOW_REQUEST: {request.method} {request.url.path} - "
                f"{duration_ms:.1f}ms"
            )
        
        # Add response header for debugging
        response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"
        
        return response

app.add_middleware(PerformanceLoggingMiddleware)

app.include_router(health.router, prefix="")
app.include_router(agents.router, prefix="/v1")
app.include_router(context.router, prefix="/v1")
app.include_router(insights.router, prefix="/v1")
app.include_router(messages.router, prefix="/v1")
app.include_router(tools.router, prefix="/v1")


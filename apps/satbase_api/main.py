from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import health, news, macro, prices, btc, convert, ingest, watchlist

app = FastAPI(title="SATBASE API", version="0.1.0")

# CORS for LookingGlass frontend (development-friendly)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="")
app.include_router(news.router, prefix="/v1")
app.include_router(macro.router, prefix="/v1")
app.include_router(prices.router, prefix="/v1")
app.include_router(btc.router, prefix="/v1")
app.include_router(convert.router, prefix="/v1")
app.include_router(ingest.router, prefix="/v1")
app.include_router(watchlist.router, prefix="/v1")


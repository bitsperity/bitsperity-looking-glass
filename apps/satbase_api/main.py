from fastapi import FastAPI

from .routers import health, news, macro, prices, btc, convert, ingest, watchlist

app = FastAPI(title="SATBASE API", version="0.1.0")

app.include_router(health.router, prefix="")
app.include_router(news.router, prefix="/v1")
app.include_router(macro.router, prefix="/v1")
app.include_router(prices.router, prefix="/v1")
app.include_router(btc.router, prefix="/v1")
app.include_router(convert.router, prefix="/v1")
app.include_router(ingest.router, prefix="/v1")
app.include_router(watchlist.router, prefix="/v1")


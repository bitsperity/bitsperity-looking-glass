"""
Price ingestion endpoint for automated technical analysis.
Manual graph building for entities/events is preferred - use Write endpoints instead.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from libs.ariadne_core.storage import GraphStore
from libs.ariadne_core.signals import PriceEventDetector
from apps.ariadne_api.main import get_graph_store
from datetime import datetime, timedelta
import httpx
import os
import uuid

router = APIRouter()

# Global detector (lazy loaded)
price_detector = None


def get_price_detector():
    global price_detector
    if price_detector is None:
        price_detector = PriceEventDetector()
    return price_detector


@router.post("/v1/kg/ingest/prices")
async def ingest_prices(
    background_tasks: BackgroundTasks,
    symbols: list[str] = Query(default=[]),
    from_date: str = Query(default=None),
    to_date: str = Query(default=None),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Ingest price data from Satbase, detect events, and populate graph.
    """
    if not symbols:
        # Get symbols from existing companies in graph
        query = "MATCH (c:Company) RETURN c.ticker AS ticker LIMIT 50"
        results = store.execute_read(query, {})
        symbols = [r["ticker"] for r in results if r.get("ticker")]
    
    if not symbols:
        raise HTTPException(status_code=400, detail="No symbols provided or found in graph")
    
    if not from_date:
        from_date = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")
    if not to_date:
        to_date = datetime.utcnow().strftime("%Y-%m-%d")
    
    background_tasks.add_task(
        run_price_ingestion,
        store,
        symbols,
        from_date,
        to_date
    )
    
    return {
        "status": "started",
        "message": f"Ingesting price data for {len(symbols)} symbols",
        "symbols": symbols,
        "from": from_date,
        "to": to_date
    }

# Background task

async def run_price_ingestion(
    store: GraphStore,
    symbols: list[str],
    from_date: str,
    to_date: str
):
    """Process price data and detect events"""
    print(f"📈 Ingesting price data for {len(symbols)} symbols...")
    
    satbase_url = os.getenv("SATBASE_URL", "http://localhost:8080")
    detector = get_price_detector()
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            total_events = 0
            
            for symbol in symbols:
                try:
                    response = await client.get(
                        f"{satbase_url}/v1/prices/daily/{symbol}",
                        params={
                            "from": from_date,
                            "to": to_date
                        }
                    )
                    
                    if response.status_code != 200:
                        continue
                    
                    data = response.json()
                    price_data = data.get("bars", [])
                    
                    if not price_data:
                        continue
                    
                    # Ensure instrument exists
                    store.execute_write(
                        "MERGE (i:Instrument {symbol: $symbol}) SET i.updated_at = datetime()",
                        {"symbol": symbol}
                    )
                    
                    # Detect price events
                    events = detector.detect_all(symbol, price_data)
                    
                    # Store events
                    for event in events:
                        event_id = str(uuid.uuid4())
                        
                        create_event_query = """
                            CREATE (pe:PriceEvent {
                                id: $id,
                                symbol: $symbol,
                                event_type: $event_type,
                                occurred_at: $occurred_at,
                                confidence: $confidence,
                                created_at: datetime()
                            })
                            SET pe += $properties
                            WITH pe
                            MATCH (i:Instrument {symbol: $symbol})
                            MERGE (pe)-[r:PRICE_EVENT_OF]->(i)
                            RETURN pe
                        """
                        
                        store.execute_write(create_event_query, {
                            "id": event_id,
                            "symbol": event["symbol"],
                            "event_type": event["event_type"],
                            "occurred_at": event["occurred_at"],
                            "confidence": event["confidence"],
                            "properties": event.get("properties", {})
                        })
                        
                        total_events += 1
                    
                    print(f"✓ {symbol}: {len(events)} events")
                
                except Exception as e:
                    print(f"✗ Error processing {symbol}: {str(e)}")
                    continue
            
            print(f"🎉 Price ingestion complete: {total_events} events created")
    
    except Exception as e:
        print(f"❌ Price ingestion failed: {str(e)}")


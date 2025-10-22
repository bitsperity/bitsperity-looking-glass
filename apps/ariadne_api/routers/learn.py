"""
Learn endpoints for batch operations and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from libs.ariadne_core.models import CorrelationRequest
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store
from datetime import datetime, timedelta
import httpx
from scipy.stats import spearmanr, pearsonr
import numpy as np
import os

router = APIRouter()


@router.post("/correlation")
async def compute_correlations(
    request: CorrelationRequest,
    background_tasks: BackgroundTasks,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Compute price correlations between symbols and store in graph.
    Runs in background for large symbol sets.
    """
    if len(request.symbols) < 2:
        raise HTTPException(status_code=400, detail="At least 2 symbols required")
    
    background_tasks.add_task(
        run_correlation_analysis,
        store,
        request.symbols,
        request.window,
        request.from_date,
        request.to_date,
        request.method
    )
    
    return {
        "status": "started",
        "message": f"Computing correlations for {len(request.symbols)} symbols",
        "symbols": request.symbols,
        "window": request.window,
        "method": request.method
    }


@router.post("/community")
async def detect_communities(
    background_tasks: BackgroundTasks,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Run Louvain community detection on company graph.
    Stores community_id on nodes.
    """
    background_tasks.add_task(run_community_detection, store)
    
    return {
        "status": "started",
        "message": "Running Louvain community detection"
    }


# Background task implementations

async def run_correlation_analysis(
    store: GraphStore,
    symbols: list[str],
    window: int,
    from_date: datetime | None,
    to_date: datetime | None,
    method: str
):
    """
    Fetch price data and compute correlations.
    """
    print(f"📊 Computing {method} correlations for {len(symbols)} symbols...")
    
    # Fetch price data from Satbase
    satbase_url = os.getenv("SATBASE_URL", "http://localhost:8080")
    
    if not to_date:
        to_date = datetime.utcnow()
    if not from_date:
        from_date = to_date - timedelta(days=window + 30)  # Extra buffer
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            price_data = {}
            
            for symbol in symbols:
                response = await client.get(
                    f"{satbase_url}/v1/prices/daily/{symbol}",
                    params={
                        "from": from_date.strftime("%Y-%m-%d"),
                        "to": to_date.strftime("%Y-%m-%d")
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("bars"):
                        price_data[symbol] = [
                            (item["date"], item["close"])
                            for item in data["bars"]
                        ]
            
            print(f"✓ Fetched price data for {len(price_data)} symbols")
            
            # Align dates and compute correlations
            if len(price_data) < 2:
                print("✗ Insufficient price data")
                return
            
            # Get common dates
            all_dates = set()
            for symbol_dates in price_data.values():
                all_dates.update([d for d, _ in symbol_dates])
            
            common_dates = sorted(list(all_dates))[-window:]  # Last N days
            
            # Build price matrix
            price_matrix = {}
            for symbol, dates_prices in price_data.items():
                date_map = {d: p for d, p in dates_prices}
                prices = [date_map.get(d) for d in common_dates]
                
                # Only include if we have most data points
                if prices.count(None) < len(prices) * 0.2:  # Allow 20% missing
                    # Forward fill missing values
                    filled = []
                    last_valid = None
                    for p in prices:
                        if p is not None:
                            last_valid = p
                        filled.append(last_valid)
                    
                    price_matrix[symbol] = filled
            
            symbols_with_data = list(price_matrix.keys())
            print(f"✓ Aligned data for {len(symbols_with_data)} symbols over {len(common_dates)} days")
            
            # Compute pairwise correlations
            correlations_created = 0
            
            for i, sym1 in enumerate(symbols_with_data):
                for sym2 in symbols_with_data[i+1:]:
                    series1 = np.array(price_matrix[sym1])
                    series2 = np.array(price_matrix[sym2])
                    
                    # Remove any remaining NaNs
                    mask = ~(np.isnan(series1) | np.isnan(series2))
                    s1 = series1[mask]
                    s2 = series2[mask]
                    
                    if len(s1) < 10:  # Need minimum data points
                        continue
                    
                    # Compute correlation
                    if method == "spearman":
                        rho, p_value = spearmanr(s1, s2)
                    else:
                        rho, p_value = pearsonr(s1, s2)
                    
                    # Only store significant correlations
                    if abs(rho) > 0.3 and p_value < 0.05:
                        # Create/update CORRELATED_WITH edge
                        query = """
                            MATCH (i1:Instrument {symbol: $sym1}), (i2:Instrument {symbol: $sym2})
                            MERGE (i1)-[r:CORRELATED_WITH]-(i2)
                            SET r.rho = $rho,
                                r.p_value = $p_value,
                                r.window = $window,
                                r.method = $method,
                                r.computed_at = $computed_at,
                                r.source = 'correlation_analysis'
                            RETURN r
                        """
                        
                        # Ensure instruments exist first
                        for sym in [sym1, sym2]:
                            store.execute_write(
                                "MERGE (i:Instrument {symbol: $symbol}) SET i.updated_at = datetime()",
                                {"symbol": sym}
                            )
                        
                        result = store.execute_write(query, {
                            "sym1": sym1,
                            "sym2": sym2,
                            "rho": float(rho),
                            "p_value": float(p_value),
                            "window": window,
                            "method": method,
                            "computed_at": datetime.utcnow().isoformat()
                        })
                        
                        if result:
                            correlations_created += 1
            
            print(f"🎉 Created {correlations_created} correlation edges")
    
    except Exception as e:
        print(f"❌ Correlation analysis failed: {str(e)}")


async def run_community_detection(store: GraphStore):
    """
    Run Louvain community detection using Neo4j GDS.
    """
    print("🔍 Running Louvain community detection...")
    
    try:
        # Check if GDS is available
        gds_check = store.execute_read("RETURN gds.version() AS version")
        
        if not gds_check:
            print("✗ Neo4j GDS not available, skipping community detection")
            return
        
        print(f"✓ GDS version: {gds_check[0]['version']}")
        
        # Project graph
        project_query = """
            CALL gds.graph.project(
                'company-graph',
                'Company',
                {
                    SUPPLIES_TO: {orientation: 'NATURAL'},
                    CORRELATED_WITH: {orientation: 'UNDIRECTED'}
                }
            )
        """
        
        # Drop existing projection if exists
        try:
            store.execute_write("CALL gds.graph.drop('company-graph')")
        except Exception:
            pass
        
        store.execute_write(project_query, {})
        print("✓ Graph projected")
        
        # Run Louvain
        louvain_query = """
            CALL gds.louvain.write('company-graph', {
                writeProperty: 'community_id'
            })
            YIELD communityCount, modularity
        """
        
        result = store.execute_write(louvain_query, {})
        
        if result:
            print(f"🎉 Detected {result['communityCount']} communities (modularity: {result['modularity']:.3f})")
        
        # Clean up projection
        store.execute_write("CALL gds.graph.drop('company-graph')")
    
    except Exception as e:
        print(f"❌ Community detection failed: {str(e)}")


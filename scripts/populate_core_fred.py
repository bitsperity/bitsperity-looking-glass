#!/usr/bin/env python3
"""
Populate Core FRED Economic Indicators

This script fetches the most important macroeconomic indicators from FRED
and stores them in Satbase for immediate availability to agents.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from libs.satbase_core.ingest.registry import registry
from libs.satbase_core.config.settings import load_settings
from datetime import date
import yaml
import logging
import os
from dotenv import load_dotenv

# Load .env first!
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
log = logging.getLogger(__name__)

# Core FRED series that every trading agent needs
CORE_FRED_SERIES = {
    # GDP & Growth
    'GDP': 'Gross Domestic Product',
    'GDPC1': 'Real Gross Domestic Product',
    'GDPPOT': 'Real Potential GDP',
    
    # Employment
    'UNRATE': 'Unemployment Rate',
    'PAYEMS': 'Nonfarm Payrolls',
    'ICSA': 'Initial Jobless Claims',
    
    # Inflation
    'CPIAUCSL': 'Consumer Price Index',
    'PCEPI': 'PCE Price Index',
    'CPILFESL': 'Core CPI (ex Food & Energy)',
    
    # Interest Rates
    'FEDFUNDS': 'Federal Funds Rate',
    'DGS10': '10-Year Treasury Yield',
    'DGS2': '2-Year Treasury Yield',
    'T10Y2Y': '10Y-2Y Treasury Spread (Recession Indicator)',
    'MORTGAGE30US': '30-Year Mortgage Rate',
    
    # Money Supply
    'M1SL': 'M1 Money Supply',
    'M2SL': 'M2 Money Supply',
    'WALCL': 'Fed Balance Sheet Total Assets',
    
    # Markets & Sentiment
    'VIXCLS': 'VIX Volatility Index',
    'DEXUSEU': 'USD/EUR Exchange Rate',
    'DTWEXBGS': 'Trade Weighted USD Index',
    
    # Energy & Commodities
    'DCOILWTICO': 'WTI Crude Oil Price',
    'GASREGW': 'US Regular Gasoline Price',
    
    # Consumer & Retail
    'RSXFS': 'Retail Sales',
    'UMCSENT': 'University of Michigan Consumer Sentiment',
    'PCE': 'Personal Consumption Expenditures',
    
    # Manufacturing & Production
    'INDPRO': 'Industrial Production Index',
    'MANEMP': 'Manufacturing Employment',
    'HOUST': 'Housing Starts',
}


def load_fred_config():
    """Load FRED configuration from sources.yaml and settings (which loads .env)"""
    # Get API key from settings (loaded from .env)
    settings = load_settings()
    
    if not settings.fred_api_key:
        log.error("FRED API key not configured in .env")
        log.info("Please add FRED_API_KEY to your .env file")
        return None
    
    # Load base config from sources.yaml
    cfg_path = Path("libs/satbase_core/config/sources.yaml")
    if cfg_path.exists():
        cfg = yaml.safe_load(cfg_path.read_text())
        fred_cfg = cfg.get("fred", {})
    else:
        fred_cfg = {}
    
    # Inject API key from settings
    fred_cfg["api_key"] = settings.fred_api_key
    
    return fred_cfg


def fetch_and_store_series(series_id: str, description: str, reg: dict, fred_cfg: dict):
    """Fetch a single FRED series and store it"""
    log.info(f"Fetching {series_id}: {description}")
    
    try:
        fetch, normalize, sink = reg["fred"]
        
        # Prepare parameters
        params = dict(fred_cfg)
        params["series"] = [series_id]
        
        # Fetch raw data
        raw = fetch(params)
        
        # Normalize to models
        models = list(normalize(raw))
        
        if not models:
            log.warning(f"  ⚠️  No data returned for {series_id}")
            return False
        
        # Sink to storage
        info = sink(models, date.today())
        
        log.info(f"  ✅ Stored {len(models)} observations for {series_id}")
        return True
        
    except Exception as e:
        log.error(f"  ❌ Failed to fetch {series_id}: {e}")
        return False


def main():
    """Main execution"""
    log.info("="*60)
    log.info("SATBASE: Core FRED Indicators Population")
    log.info("="*60)
    
    # Load settings
    settings = load_settings()
    log.info(f"Stage directory: {settings.stage_dir}")
    
    # Load FRED config
    fred_cfg = load_fred_config()
    if not fred_cfg:
        return 1
    
    # Get registry
    reg = registry()
    if "fred" not in reg:
        log.error("FRED adapter not found in registry")
        return 1
    
    log.info(f"\nFetching {len(CORE_FRED_SERIES)} core indicators...")
    log.info("-"*60)
    
    # Fetch all series
    success_count = 0
    fail_count = 0
    
    for series_id, description in CORE_FRED_SERIES.items():
        if fetch_and_store_series(series_id, description, reg, fred_cfg):
            success_count += 1
        else:
            fail_count += 1
    
    # Summary
    log.info("-"*60)
    log.info(f"✅ Successfully stored: {success_count}/{len(CORE_FRED_SERIES)}")
    if fail_count > 0:
        log.warning(f"❌ Failed: {fail_count}/{len(CORE_FRED_SERIES)}")
    log.info("="*60)
    log.info("Core FRED indicators are now available in Satbase!")
    log.info("Agents can query macro data without waiting for ingestion.")
    log.info("="*60)
    
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())


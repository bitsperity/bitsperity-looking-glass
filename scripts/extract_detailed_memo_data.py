#!/usr/bin/env python3
"""
Extract DETAILED structured data from Memos into Knowledge Graph.

Current Gap: Memos contain:
- Geopolitical events (Taiwan, Middle East, US Election)
- Central Bank actions (Fed, ECB, PBoC with dates + probabilities)
- Commodity prices (Gold, Oil, Copper with trends)
- Macro indicators (VIX, DXY, Put/Call with regime assessment)
- M&A events (or lack thereof)
- Earnings alerts (upcoming + surprises)
- Portfolio alerts (losses, sector rotation)

This data is NOT in the graph yet!
"""

import sqlite3
import json
from datetime import datetime
import re
import os

PROJECT_ID = "alpaca-bot"
DB_PATH = "../knowledge_graph/knowledgegraph.db"

class DetailedMemoExtractor:
    def __init__(self, dry_run=True):
        self.dry_run = dry_run
        if not dry_run:
            self.conn = sqlite3.connect(DB_PATH)
        self.stats = {
            "entities_created": 0,
            "relations_created": 0,
            "observations_added": 0,
        }
    
    def create_entity(self, name: str, entity_type: str, observations: list[str], tags: list[str]):
        """Create entity in graph."""
        if self.dry_run:
            print(f"[DRY-RUN] Create Entity: {name} ({entity_type})")
            for obs in observations[:3]:
                print(f"    - {obs}")
            return
        
        # Check if exists
        cursor = self.conn.execute(
            "SELECT 1 FROM entities WHERE project = ? AND name = ?",
            (PROJECT_ID, name)
        )
        if cursor.fetchone():
            print(f"  ⏭️  SKIP: {name} (already exists)")
            return
        
        # Insert
        self.conn.execute(
            """INSERT INTO entities (project, name, entity_type, observations, tags)
               VALUES (?, ?, ?, ?, ?)""",
            (PROJECT_ID, name, entity_type, json.dumps(observations), json.dumps(tags))
        )
        self.conn.commit()
        self.stats["entities_created"] += 1
        print(f"  ✅ Created: {name}")
    
    def extract_macro_memo(self, filepath: str, date: str):
        """Extract detailed macro data."""
        print(f"\n📊 Processing: {filepath}")
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        entities = []
        
        # 1. Central Bank Entities
        fed_match = re.search(r'Fed.*?([\d.]+\-[\d.]+%)', content)
        if fed_match:
            entities.append({
                "name": f"Fed_Policy_{date}",
                "type": "central_bank_policy",
                "observations": [
                    f"date={date}",
                    f"bank=Fed",
                    f"rate={fed_match.group(1)}",
                    self._extract_line_with_context(content, "Fed", 3),
                ],
                "tags": ["macro", "Fed", date, "monetary_policy"]
            })
        
        # 2. ECB
        ecb_match = re.search(r'ECB.*?([\d.]+%)', content)
        if ecb_match:
            entities.append({
                "name": f"ECB_Policy_{date}",
                "type": "central_bank_policy",
                "observations": [
                    f"date={date}",
                    f"bank=ECB",
                    f"rate={ecb_match.group(1)}",
                    self._extract_line_with_context(content, "ECB", 3),
                ],
                "tags": ["macro", "ECB", date, "monetary_policy"]
            })
        
        # 3. China/PBoC
        china_match = re.search(r'China.*?Stimulus', content, re.IGNORECASE)
        if china_match:
            entities.append({
                "name": f"China_Stimulus_{date}",
                "type": "economic_policy",
                "observations": [
                    f"date={date}",
                    f"country=China",
                    self._extract_line_with_context(content, "China", 5),
                    self._extract_line_with_context(content, "PBoC", 3),
                ],
                "tags": ["macro", "China", date, "stimulus"]
            })
        
        # 4. Geopolitical Events
        if "Middle East" in content:
            entities.append({
                "name": f"MiddleEast_Status_{date}",
                "type": "geopolitical_event",
                "observations": [
                    f"date={date}",
                    f"region=Middle East",
                    self._extract_line_with_context(content, "Middle East", 3),
                ],
                "tags": ["geopolitics", "middle_east", date]
            })
        
        if "Taiwan" in content:
            entities.append({
                "name": f"Taiwan_Status_{date}",
                "type": "geopolitical_event",
                "observations": [
                    f"date={date}",
                    f"region=Taiwan",
                    self._extract_line_with_context(content, "Taiwan", 2),
                ],
                "tags": ["geopolitics", "taiwan", date, "china_risk"]
            })
        
        if "Election" in content:
            entities.append({
                "name": f"US_Election_{date}",
                "type": "political_event",
                "observations": [
                    f"date={date}",
                    f"country=USA",
                    self._extract_line_with_context(content, "Election", 2),
                ],
                "tags": ["politics", "usa", date, "election"]
            })
        
        # 5. Commodities
        gold_match = re.search(r'Gold.*?\$?([\d,]+)', content)
        if gold_match:
            entities.append({
                "name": f"Gold_Price_{date}",
                "type": "commodity_price",
                "observations": [
                    f"date={date}",
                    f"commodity=Gold",
                    f"price=${gold_match.group(1)}",
                    self._extract_line_with_context(content, "Gold", 2),
                ],
                "tags": ["commodities", "gold", date]
            })
        
        oil_match = re.search(r'Oil.*?\$?([\d.]+)', content)
        if oil_match:
            entities.append({
                "name": f"Oil_Price_{date}",
                "type": "commodity_price",
                "observations": [
                    f"date={date}",
                    f"commodity=Oil",
                    f"price=${oil_match.group(1)}",
                    self._extract_line_with_context(content, "Oil", 2),
                ],
                "tags": ["commodities", "oil", date]
            })
        
        # 6. Regime Assessment
        vix_match = re.search(r'VIX.*?([\d.]+)', content)
        regime_match = re.search(r'Regime.*?(Risk-On|Risk-Off)', content, re.IGNORECASE)
        if vix_match and regime_match:
            entities.append({
                "name": f"Market_Regime_{date}",
                "type": "market_regime",
                "observations": [
                    f"date={date}",
                    f"vix={vix_match.group(1)}",
                    f"regime={regime_match.group(1)}",
                    self._extract_line_with_context(content, "Regime", 3),
                ],
                "tags": ["macro", "regime", date]
            })
        
        # Create entities
        for ent in entities:
            self.create_entity(ent["name"], ent["type"], ent["observations"], ent["tags"])
        
        return len(entities)
    
    def extract_news_digest(self, filepath: str, date: str):
        """Extract news events."""
        print(f"\n📰 Processing: {filepath}")
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        entities = []
        
        # 1. M&A Events
        if "M&A" in content:
            ma_context = self._extract_section(content, "M&A")
            entities.append({
                "name": f"MA_Activity_{date}",
                "type": "market_event",
                "observations": [
                    f"date={date}",
                    f"type=M&A",
                    ma_context[:200],
                ],
                "tags": ["news", "ma", date]
            })
        
        # 2. Earnings Alerts
        if "Earnings" in content:
            earnings_context = self._extract_section(content, "Earnings")
            entities.append({
                "name": f"Earnings_Alert_{date}",
                "type": "market_event",
                "observations": [
                    f"date={date}",
                    f"type=earnings",
                    earnings_context[:200],
                ],
                "tags": ["news", "earnings", date]
            })
        
        # 3. Portfolio Alerts
        alert_match = re.findall(r'[🟡🔴🟢].*?(APP|NVDA|PLTR|.*?):.*?(-?[\d.]+%)', content)
        for ticker, perf in alert_match[:5]:
            entities.append({
                "name": f"Alert_{ticker}_{date}",
                "type": "portfolio_alert",
                "observations": [
                    f"date={date}",
                    f"ticker={ticker}",
                    f"performance={perf}",
                    self._extract_line_with_context(content, ticker, 1),
                ],
                "tags": ["alert", ticker, date]
            })
        
        # Create entities
        for ent in entities:
            self.create_entity(ent["name"], ent["type"], ent["observations"], ent["tags"])
        
        return len(entities)
    
    def _extract_line_with_context(self, content: str, keyword: str, lines: int = 2) -> str:
        """Extract line containing keyword + N lines context."""
        lines_list = content.split('\n')
        for i, line in enumerate(lines_list):
            if keyword in line and not line.startswith('#'):
                start = max(0, i - lines)
                end = min(len(lines_list), i + lines + 1)
                return ' '.join(lines_list[start:end]).strip()[:200]
        return ""
    
    def _extract_section(self, content: str, header: str) -> str:
        """Extract markdown section by header."""
        lines = content.split('\n')
        section = []
        capture = False
        for line in lines:
            if f"## {header}" in line or f"### {header}" in line:
                capture = True
                continue
            if capture:
                if line.startswith('##'):
                    break
                section.append(line)
        return ' '.join(section).strip()
    
    def run(self):
        """Process all memo files."""
        print("=" * 60)
        print("📊 DETAILED MEMO EXTRACTION")
        print("=" * 60)
        
        # Process macro memos
        for file in os.listdir("../research/macro"):
            if file.endswith(".md"):
                date = file.replace("-macro-memo.md", "").replace("-", "")
                self.extract_macro_memo(f"../research/macro/{file}", date)
        
        # Process news digests
        for file in os.listdir("../research/news"):
            if file.endswith(".md"):
                date = file.replace("-news-digest.md", "").replace("-", "")
                self.extract_news_digest(f"../research/news/{file}", date)
        
        print("\n" + "=" * 60)
        print("📊 STATS")
        print("=" * 60)
        print(f"Entities Created: {self.stats['entities_created']}")
        print(f"Relations Created: {self.stats['relations_created']}")
        print(f"Observations Added: {self.stats['observations_added']}")

if __name__ == "__main__":
    import sys
    dry_run = "--live" not in sys.argv
    
    if dry_run:
        print("🔍 DRY RUN MODE (use --live to execute)")
    else:
        print("⚠️  LIVE MODE - Writing to database!")
    
    extractor = DetailedMemoExtractor(dry_run=dry_run)
    extractor.run()



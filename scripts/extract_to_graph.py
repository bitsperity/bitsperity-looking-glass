#!/usr/bin/env python3
"""
Extract all pipeline outputs to Knowledge Graph.

Usage:
    python scripts/extract_to_graph.py [--dry-run]
"""

import json
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

PROJECT_ID = "alpaca-bot"
DB_PATH = "knowledge_graph/knowledgegraph.db"

class GraphExtractor:
    def __init__(self, db_path: str, dry_run: bool = False):
        self.db_path = db_path
        self.dry_run = dry_run
        self.conn = sqlite3.connect(db_path) if not dry_run else None
        self.stats = {
            "entities_created": 0,
            "relations_created": 0,
            "files_processed": 0
        }
    
    def create_entity(self, name: str, entity_type: str, observations: List[str], tags: List[str]):
        """Create entity in graph."""
        if self.dry_run:
            print(f"[DRY-RUN] Create Entity: {name} ({entity_type})")
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
    
    def create_relation(self, from_entity: str, to_entity: str, relation_type: str):
        """Create relation in graph."""
        if self.dry_run:
            print(f"[DRY-RUN] Create Relation: {from_entity} --[{relation_type}]--> {to_entity}")
            return
        
        # Check if exists
        cursor = self.conn.execute(
            """SELECT 1 FROM relations 
               WHERE project = ? AND from_entity = ? AND to_entity = ? AND relation_type = ?""",
            (PROJECT_ID, from_entity, to_entity, relation_type)
        )
        if cursor.fetchone():
            return
        
        # Insert
        self.conn.execute(
            """INSERT INTO relations (project, from_entity, to_entity, relation_type)
               VALUES (?, ?, ?, ?)""",
            (PROJECT_ID, from_entity, to_entity, relation_type)
        )
        self.conn.commit()
        self.stats["relations_created"] += 1
    
    # ========== DISCOVERY CANDIDATES ==========
    def extract_discovery(self, file_path: Path):
        """Extract discovery candidates JSON."""
        print(f"\n📦 Processing: {file_path}")
        data = json.loads(file_path.read_text())
        
        date = data.get("discovery_date", file_path.stem.split("-")[-1])
        
        for candidate in data.get("candidates", []):
            symbol = candidate["symbol"]
            
            # Create Company Entity
            observations = [
                f"discovery_date={date}",
                f"sector={candidate.get('sector', 'Unknown')}",
                f"industry={candidate.get('industry', 'Unknown')}",
                f"theme={candidate.get('theme', '')}",
                f"market_cap_usd={candidate.get('market_cap_usd', 0)}",
                f"price_current={candidate.get('price_current', 0)}",
                f"performance_1m={candidate.get('performance_1m', 0)}",
                f"performance_5d={candidate.get('performance_5d', 0)}",
                f"revenue_growth={candidate.get('revenue_growth', 0)}",
                f"profit_margin={candidate.get('profit_margin', 0)}",
                f"pe_ratio={candidate.get('pe_ratio', 0)}",
                f"discovery_score={candidate.get('discovery_score', 0)}",
                f"rotation_signal={candidate.get('rotation_signal', '')}",
                f"macro_driver={candidate.get('macro_driver', '')}"
            ]
            
            tags = ["DISCOVERY", date, candidate.get("sector", "").upper()]
            if candidate.get("discovery_score", 0) > 0.70:
                tags.append("HIGH_CONVICTION")
            
            self.create_entity(symbol, "company", observations, tags)
            
            # Create Theme Entity
            theme = candidate.get("theme", "").replace(" ", "_")
            if theme:
                theme_name = f"{theme}_Theme"
                self.create_entity(
                    theme_name, 
                    "theme",
                    [f"name={theme}", f"discovered_on={date}"],
                    ["THEME", date]
                )
                self.create_relation(symbol, theme_name, "aligned_with")
        
        self.stats["files_processed"] += 1
    
    # ========== CONVICTIONS ==========
    def extract_convictions(self, file_path: Path):
        """Extract conviction ledger JSONL."""
        print(f"\n📊 Processing: {file_path}")
        
        ticker = file_path.stem.replace("_ledger", "")
        
        for line in file_path.read_text().strip().split("\n"):
            if not line.strip():
                continue
            
            entry = json.loads(line)
            date = entry["date"]
            conviction = entry["conviction"]
            thesis = entry["thesis"]
            sources = entry.get("sources", [])
            
            # Create Conviction Entry
            entity_name = f"{ticker}_Conviction_{date.replace('-', '')}"
            observations = [
                f"date={date}",
                f"ticker={ticker}",
                f"conviction={conviction}",
                f"thesis={thesis}",
                f"sources={','.join(sources)}"
            ]
            
            tags = ["CONVICTION", date, ticker]
            if conviction > 0.80:
                tags.append("HIGH")
            elif conviction > 0.60:
                tags.append("MEDIUM")
            else:
                tags.append("LOW")
            
            self.create_entity(entity_name, "conviction_entry", observations, tags)
            self.create_relation(entity_name, ticker, "conviction_for")
        
        self.stats["files_processed"] += 1
    
    # ========== PORTFOLIO TILTS ==========
    def extract_tilts(self, file_path: Path):
        """Extract portfolio tilts from markdown."""
        print(f"\n📈 Processing: {file_path}")
        
        date = file_path.stem  # e.g., "20251007-tilts" -> "20251007"
        if "-" in date:
            date = date.split("-")[0]
        
        # Parse markdown table (simplified)
        content = file_path.read_text()
        
        # Create Portfolio Decision Entity
        entity_name = f"Portfolio_Tilt_{date}"
        observations = [
            f"date={date}",
            f"file={file_path.name}",
            "type=portfolio_decision"
        ]
        
        # Extract metadata from content
        if "Total Positions:" in content:
            import re
            positions = re.search(r"Total Positions:\*\* (\d+)", content)
            if positions:
                observations.append(f"total_positions={positions.group(1)}")
        
        self.create_entity(entity_name, "portfolio_decision", observations, ["PORTFOLIO", date, "TILTS"])
        self.stats["files_processed"] += 1
    
    # ========== EXECUTION LOGS ==========
    def extract_execution(self, file_path: Path):
        """Extract execution logs JSONL."""
        print(f"\n💼 Processing: {file_path}")
        
        for line in file_path.read_text().strip().split("\n"):
            if not line.strip():
                continue
            
            entry = json.loads(line)
            timestamp = entry["timestamp"]
            symbol = entry["symbol"]
            side = entry["side"]
            
            # Create Trade Entity
            entity_name = f"Trade_{symbol}_{timestamp.replace(':', '').replace('-', '')}"
            observations = [
                f"timestamp={timestamp}",
                f"symbol={symbol}",
                f"side={side}",
                f"qty={entry.get('qty', 0)}",
                f"limit_price={entry.get('limit_price', 0)}",
                f"order_id={entry.get('order_id', '')}",
                f"status={entry.get('status', '')}",
                f"account={entry.get('account', '')}",
                f"rationale={entry.get('rationale', '')}"
            ]
            
            tags = ["TRADE", timestamp.split("T")[0], symbol, side.upper(), entry.get("account", "")]
            
            self.create_entity(entity_name, "trade_execution", observations, tags)
            self.create_relation(entity_name, symbol, "trades")
        
        self.stats["files_processed"] += 1
    
    # ========== MAIN EXTRACTION ==========
    def run(self):
        """Run all extractors."""
        print("🚀 Starting Graph Extraction...\n")
        
        # 1. Discovery Candidates
        discovery_files = Path("discovery/sector_rotation").glob("candidates-*.json")
        for f in discovery_files:
            try:
                self.extract_discovery(f)
            except Exception as e:
                print(f"  ❌ ERROR: {e}")
        
        # 2. Convictions
        conviction_files = Path("convictions").glob("*_ledger.jsonl")
        for f in conviction_files:
            try:
                self.extract_convictions(f)
            except Exception as e:
                print(f"  ❌ ERROR: {e}")
        
        # 3. Portfolio Tilts
        tilt_files = Path("decisions/tilts").glob("*.md")
        for f in tilt_files:
            try:
                self.extract_tilts(f)
            except Exception as e:
                print(f"  ❌ ERROR: {e}")
        
        # 4. Execution Logs
        execution_files = Path("execution/logs").glob("*.jsonl")
        for f in execution_files:
            try:
                self.extract_execution(f)
            except Exception as e:
                print(f"  ❌ ERROR: {e}")
        
        # Print Stats
        print("\n" + "="*60)
        print("📊 EXTRACTION SUMMARY")
        print("="*60)
        print(f"Files Processed:    {self.stats['files_processed']}")
        print(f"Entities Created:   {self.stats['entities_created']}")
        print(f"Relations Created:  {self.stats['relations_created']}")
        print("="*60)
        
        if not self.dry_run and self.conn:
            self.conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract pipeline outputs to Knowledge Graph")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing to DB")
    args = parser.parse_args()
    
    extractor = GraphExtractor(DB_PATH, dry_run=args.dry_run)
    extractor.run()


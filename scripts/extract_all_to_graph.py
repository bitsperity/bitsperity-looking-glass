#!/usr/bin/env python3
"""
COMPLETE Graph Extraction - ALL pipeline outputs.

Extracts:
- Discovery Candidates ✓
- Convictions ✓
- Trades ✓
- Daily Memos (Macro, Sectors, News, Markets, Risk)
- Deep Dives (Markdown parsing)
- Sector Summaries
- BTC Accounting
- Graph Insights
"""

import json
import sqlite3
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

PROJECT_ID = "alpaca-bot"
DB_PATH = "knowledge_graph/knowledgegraph.db"

class MaximalGraphExtractor:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.stats = {
            "entities_created": 0,
            "relations_created": 0,
            "files_processed": 0,
            "files_deleted": 0
        }
        self.files_to_delete = []
    
    def entity_exists(self, name: str) -> bool:
        cursor = self.conn.execute(
            "SELECT 1 FROM entities WHERE project = ? AND name = ?",
            (PROJECT_ID, name)
        )
        return cursor.fetchone() is not None
    
    def create_entity(self, name: str, entity_type: str, observations: List[str], tags: List[str]):
        if self.entity_exists(name):
            print(f"  ⏭️  SKIP: {name}")
            return False
        
        self.conn.execute(
            "INSERT INTO entities (project, name, entity_type, observations, tags) VALUES (?, ?, ?, ?, ?)",
            (PROJECT_ID, name, entity_type, json.dumps(observations), json.dumps(tags))
        )
        self.conn.commit()
        self.stats["entities_created"] += 1
        print(f"  ✅ Created: {name}")
        return True
    
    def create_relation(self, from_entity: str, to_entity: str, relation_type: str):
        cursor = self.conn.execute(
            "SELECT 1 FROM relations WHERE project = ? AND from_entity = ? AND to_entity = ? AND relation_type = ?",
            (PROJECT_ID, from_entity, to_entity, relation_type)
        )
        if cursor.fetchone():
            return False
        
        self.conn.execute(
            "INSERT INTO relations (project, from_entity, to_entity, relation_type) VALUES (?, ?, ?, ?)",
            (PROJECT_ID, from_entity, to_entity, relation_type)
        )
        self.conn.commit()
        self.stats["relations_created"] += 1
        return True
    
    # ========== DAILY MEMOS ==========
    def extract_macro_memo(self, file_path: Path):
        """Extract macro memo markdown."""
        print(f"\n🌍 Processing: {file_path}")
        content = file_path.read_text()
        date = file_path.stem.split("-")[0]  # e.g., "20251007-macro-memo" -> "20251007"
        
        observations = [f"date={date}", f"type=macro_memo", f"file={file_path.name}"]
        
        # Extract VIX
        vix_match = re.search(r"VIX.*?(\d+\.\d+)", content)
        if vix_match:
            observations.append(f"vix={vix_match.group(1)}")
        
        # Extract regime
        if "Risk-On" in content or "RISK-ON" in content:
            observations.append("regime=RISK_ON")
        elif "Risk-Off" in content or "RISK-OFF" in content:
            observations.append("regime=RISK_OFF")
        
        # Extract Gold mentions
        gold_match = re.search(r"Gold.*?\$?(\d+)", content)
        if gold_match:
            observations.append(f"gold_price={gold_match.group(1)}")
        
        entity_name = f"Macro_Memo_{date}"
        self.create_entity(entity_name, "macro_snapshot", observations, ["MACRO", date, "DAILY"])
        self.stats["files_processed"] += 1
    
    def extract_sector_memo(self, file_path: Path):
        """Extract sector rotation memo."""
        print(f"\n📊 Processing: {file_path}")
        content = file_path.read_text()
        date = file_path.stem.split("-")[0]
        
        observations = [f"date={date}", f"type=sector_memo", f"file={file_path.name}"]
        
        # Extract sector performances
        for sector in ["XLK", "XLF", "XLE", "XLV", "XLU", "XLP", "XLY", "XLI", "XLB", "XLC", "XLRE"]:
            match = re.search(rf"{sector}.*?([+-]?\d+\.\d+)%", content)
            if match:
                observations.append(f"{sector.lower()}_performance={match.group(1)}")
        
        entity_name = f"Sector_Memo_{date}"
        self.create_entity(entity_name, "sector_snapshot", observations, ["SECTOR", date, "DAILY"])
        self.stats["files_processed"] += 1
    
    def extract_news_memo(self, file_path: Path):
        """Extract news digest."""
        print(f"\n📰 Processing: {file_path}")
        content = file_path.read_text()
        date = file_path.stem.split("-")[0]
        
        observations = [f"date={date}", f"type=news_digest", f"file={file_path.name}"]
        
        # Count mentions
        for ticker in ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META"]:
            count = content.count(ticker)
            if count > 0:
                observations.append(f"mentions_{ticker}={count}")
        
        entity_name = f"News_Digest_{date}"
        self.create_entity(entity_name, "news_snapshot", observations, ["NEWS", date, "DAILY"])
        self.stats["files_processed"] += 1
    
    def extract_risk_report(self, file_path: Path):
        """Extract risk report."""
        print(f"\n⚠️  Processing: {file_path}")
        content = file_path.read_text()
        date = file_path.stem.split("-")[0]
        
        observations = [f"date={date}", f"type=risk_report", f"file={file_path.name}"]
        
        # Extract concentration warnings
        if "concentration" in content.lower():
            observations.append("alert_concentration=true")
        if "correlation" in content.lower():
            observations.append("alert_correlation=true")
        
        entity_name = f"Risk_Report_{date}"
        self.create_entity(entity_name, "risk_assessment", observations, ["RISK", date, "DAILY"])
        self.stats["files_processed"] += 1
    
    # ========== DEEP DIVES ==========
    def extract_deep_dive(self, file_path: Path):
        """Extract deep dive markdown."""
        print(f"\n🔬 Processing: {file_path}")
        content = file_path.read_text()
        
        # Extract ticker from path (e.g., research/deep_dives/LRCX/20251007.md)
        ticker = file_path.parent.name
        date = file_path.stem  # e.g., "20251007"
        
        observations = [f"date={date}", f"ticker={ticker}", f"file={file_path.name}"]
        
        # Extract conviction
        conv_match = re.search(r"Conviction[:\s]+(\d\.\d+)", content)
        if conv_match:
            observations.append(f"conviction={conv_match.group(1)}")
        
        # Extract TAM
        tam_match = re.search(r"TAM[:\s]*\$?(\d+)B", content)
        if tam_match:
            observations.append(f"tam_billion={tam_match.group(1)}")
        
        # Extract moats
        moat_matches = re.findall(r"Moat #\d+[:\s]*([^\n]+)", content)
        for i, moat in enumerate(moat_matches, 1):
            observations.append(f"moat_{i}={moat[:100]}")
        
        # Extract risks
        risk_matches = re.findall(r"Risk #\d+[:\s]*([^\n]+)", content)
        for i, risk in enumerate(risk_matches, 1):
            observations.append(f"risk_{i}={risk[:100]}")
        
        entity_name = f"{ticker}_DeepDive_{date}"
        if self.create_entity(entity_name, "deep_dive_analysis", observations, ["DEEP_DIVE", date, ticker, "RESEARCH"]):
            self.create_relation(entity_name, ticker, "analyzes")
        
        self.stats["files_processed"] += 1
    
    # ========== SECTOR SUMMARIES ==========
    def extract_sector_summary(self, file_path: Path):
        """Extract sector summary JSON."""
        print(f"\n🗺️  Processing: {file_path}")
        data = json.loads(file_path.read_text())
        date = data.get("date", file_path.stem.split("-")[-1])
        
        observations = [f"date={date}", f"sectors_analyzed={data.get('sectors_analyzed', 11)}"]
        
        for sector in data.get("in_sectors", []):
            observations.append(f"in_sector={sector}")
        for sector in data.get("out_sectors", []):
            observations.append(f"out_sector={sector}")
        
        entity_name = f"Sector_Summary_{date}"
        self.create_entity(entity_name, "sector_summary", observations, ["SECTOR", date, "SUMMARY"])
        self.stats["files_processed"] += 1
    
    # ========== BTC ACCOUNTING ==========
    def extract_btc_alpha(self, file_path: Path):
        """Extract BTC alpha tracking."""
        print(f"\n₿  Processing: {file_path}")
        
        for line in file_path.read_text().strip().split("\n"):
            if not line.strip():
                continue
            
            entry = json.loads(line)
            date = entry.get("date", "unknown")
            
            observations = [
                f"date={date}",
                f"portfolio_return={entry.get('portfolio_return', 0)}",
                f"btc_return={entry.get('btc_return', 0)}",
                f"alpha={entry.get('alpha', 0)}",
                f"sharpe={entry.get('sharpe', 0)}"
            ]
            
            entity_name = f"BTC_Alpha_{date.replace('-', '')}"
            self.create_entity(entity_name, "btc_alpha_entry", observations, ["BTC", date, "ALPHA"])
        
        self.stats["files_processed"] += 1
    
    # ========== MAIN ==========
    def run(self):
        print("🚀 MAXIMAL GRAPH EXTRACTION\n")
        
        # 1. Daily Memos
        for f in Path("research/macro").glob("*.md"):
            try: self.extract_macro_memo(f)
            except Exception as e: print(f"  ❌ ERROR: {e}")
        
        for f in Path("research/sectors").glob("*.md"):
            try: self.extract_sector_memo(f)
            except Exception as e: print(f"  ❌ ERROR: {e}")
        
        for f in Path("research/news").glob("*.md"):
            try: self.extract_news_memo(f)
            except Exception as e: print(f"  ❌ ERROR: {e}")
        
        for f in Path("research/risk").glob("*.md"):
            try: self.extract_risk_report(f)
            except Exception as e: print(f"  ❌ ERROR: {e}")
        
        # 2. Deep Dives
        for ticker_dir in Path("research/deep_dives").iterdir():
            if ticker_dir.is_dir():
                for f in ticker_dir.glob("*.md"):
                    try: self.extract_deep_dive(f)
                    except Exception as e: print(f"  ❌ ERROR: {e}")
        
        # 3. Sector Summaries
        for f in Path("discovery/sector_rotation").glob("sector-summary-*.json"):
            try: self.extract_sector_summary(f)
            except Exception as e: print(f"  ❌ ERROR: {e}")
        
        # 4. BTC Alpha
        for f in Path("btc_accounting").glob("*.jsonl"):
            try: self.extract_btc_alpha(f)
            except Exception as e: print(f"  ❌ ERROR: {e}")
        
        # Print Stats
        print("\n" + "="*60)
        print("📊 EXTRACTION SUMMARY")
        print("="*60)
        print(f"Files Processed:    {self.stats['files_processed']}")
        print(f"Entities Created:   {self.stats['entities_created']}")
        print(f"Relations Created:  {self.stats['relations_created']}")
        print("="*60)
        
        self.conn.close()

if __name__ == "__main__":
    extractor = MaximalGraphExtractor(DB_PATH)
    extractor.run()



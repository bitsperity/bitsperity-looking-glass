#!/usr/bin/env python3
"""
Extract remaining JSON data to Knowledge Graph.
- BTC Positions
- Order Specifications
"""

import json
import sqlite3
from pathlib import Path
from datetime import datetime

PROJECT_ID = "alpaca-bot"
DB_PATH = "knowledge_graph/knowledgegraph.db"

class RemainingExtractor:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.stats = {"entities_created": 0, "relations_created": 0}
    
    def entity_exists(self, name: str) -> bool:
        cursor = self.conn.execute(
            "SELECT 1 FROM entities WHERE project = ? AND name = ?",
            (PROJECT_ID, name)
        )
        return cursor.fetchone() is not None
    
    def create_entity(self, name: str, entity_type: str, observations: list, tags: list):
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
    
    def extract_btc_positions(self, file_path: Path):
        """Extract BTC accounting data."""
        print(f"\n₿  Processing: {file_path}")
        data = json.loads(file_path.read_text())
        
        asof = data.get("asof", "unknown")
        
        # Main BTC Position Entity
        observations = [
            f"date={asof}",
            f"btc_usd_price={data.get('btc_usd_price', 0)}",
            f"btc_usd_entry_price={data.get('btc_usd_entry_price', 0)}",
            f"btc_ytd_return={data.get('btc_ytd_return', 0)}",
            f"portfolio_btc_return={data['portfolio'].get('portfolio_btc_return', 0)}",
            f"portfolio_btc_alpha={data['portfolio'].get('portfolio_btc_alpha', 0)}",
            f"btc_destroyed={data['portfolio'].get('btc_destroyed', 0)}"
        ]
        
        entity_name = f"BTC_Position_{asof.replace('-', '')}"
        self.create_entity(entity_name, "btc_position", observations, ["BTC", asof, "ACCOUNTING"])
        
        # Watchlist Hypothetical
        for watch in data.get("watchlist_hypothetical", []):
            symbol = watch["symbol"]
            obs = [
                f"date={asof}",
                f"symbol={symbol}",
                f"usd_return={watch.get('usd_return', 0)}",
                f"btc_return={watch.get('btc_return', 0)}",
                f"btc_alpha={watch.get('btc_alpha', 0)}",
                f"verdict={watch.get('verdict', '')}",
                f"rank={watch.get('rank', 0)}"
            ]
            
            hypo_name = f"{symbol}_BTC_Hypothetical_{asof.replace('-', '')}"
            self.create_entity(hypo_name, "btc_hypothetical", obs, ["BTC", asof, symbol])
            self.create_relation(entity_name, hypo_name, "analyzes")
    
    def extract_orders(self, file_path: Path):
        """Extract order specifications."""
        print(f"\n📋 Processing: {file_path}")
        data = json.loads(file_path.read_text())
        
        asof = data.get("asof", "unknown")
        date = asof.split("T")[0] if "T" in asof else asof
        
        for order in data.get("orders", []):
            symbol = order["symbol"]
            side = order["side"]
            
            observations = [
                f"date={date}",
                f"symbol={symbol}",
                f"side={side}",
                f"qty={order.get('qty', 0)}",
                f"type={order.get('type', '')}",
                f"limit_price={order.get('limit_price', 0)}",
                f"tif={order.get('tif', '')}",
                f"rationale={order.get('rationale', '')}",
                f"target_value={order.get('target_value', 0)}",
                f"current_value={order.get('current_value', 0)}"
            ]
            
            order_name = f"Order_{symbol}_{date.replace('-', '')}_{side}"
            if self.create_entity(order_name, "order_spec", observations, ["ORDER", date, symbol, side.upper()]):
                self.create_relation(order_name, symbol, "orders")
    
    def run(self):
        print("🚀 REMAINING DATA EXTRACTION\n")
        
        # BTC Positions
        btc_file = Path("btc_accounting/positions_btc.json")
        if btc_file.exists():
            try:
                self.extract_btc_positions(btc_file)
            except Exception as e:
                print(f"  ❌ ERROR: {e}")
        
        # Orders
        for order_file in Path("execution/orders").glob("*.json"):
            try:
                self.extract_orders(order_file)
            except Exception as e:
                print(f"  ❌ ERROR: {e}")
        
        print("\n" + "="*60)
        print("📊 EXTRACTION SUMMARY")
        print("="*60)
        print(f"Entities Created:   {self.stats['entities_created']}")
        print(f"Relations Created:  {self.stats['relations_created']}")
        print("="*60)
        
        self.conn.close()

if __name__ == "__main__":
    extractor = RemainingExtractor(DB_PATH)
    extractor.run()



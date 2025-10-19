#!/usr/bin/env python3
"""
FINAL EXTRACTION - Alles strukturiert in den Graph.

Goal: Repo 100% clean, nur Graph übrig, ALLES querybar.

Was rein muss:
1. Deep Dive Details (DCF, Competitive Analysis, Risk)
2. Daily Memo Assessments (Implications, Regime)
3. Graph Insights (Theme Momentum, Pipeline Metrics)
4. Tilt Rationales (Why each position)

Output: Structured entities mit klaren Tags für Queries.
"""

import sqlite3
import json
import re
import os
from datetime import datetime

PROJECT_ID = "alpaca-bot"
DB_PATH = "../knowledge_graph/knowledgegraph.db"

class FinalExtractor:
    def __init__(self, dry_run=True):
        self.dry_run = dry_run
        if not dry_run:
            self.conn = sqlite3.connect(DB_PATH)
        self.stats = {
            "entities": 0,
            "relations": 0,
        }
    
    def create_entity(self, name: str, entity_type: str, observations: list[str], tags: list[str]):
        """Create or skip entity."""
        if self.dry_run:
            print(f"[DRY-RUN] {name} ({entity_type})")
            return
        
        cursor = self.conn.execute(
            "SELECT 1 FROM entities WHERE project = ? AND name = ?",
            (PROJECT_ID, name)
        )
        if cursor.fetchone():
            print(f"  ⏭️  SKIP: {name}")
            return
        
        self.conn.execute(
            """INSERT INTO entities (project, name, entity_type, observations, tags)
               VALUES (?, ?, ?, ?, ?)""",
            (PROJECT_ID, name, entity_type, json.dumps(observations), json.dumps(tags))
        )
        self.conn.commit()
        self.stats["entities"] += 1
        print(f"  ✅ {name}")
    
    def create_relation(self, from_e: str, to_e: str, rel_type: str):
        """Create relation if both entities exist."""
        if self.dry_run:
            return
        
        # Check both exist
        cursor = self.conn.execute(
            "SELECT 1 FROM entities WHERE project = ? AND name = ?",
            (PROJECT_ID, from_e)
        )
        if not cursor.fetchone():
            return
        
        cursor = self.conn.execute(
            "SELECT 1 FROM entities WHERE project = ? AND name = ?",
            (PROJECT_ID, to_e)
        )
        if not cursor.fetchone():
            return
        
        # Check if relation exists
        cursor = self.conn.execute(
            """SELECT 1 FROM relations 
               WHERE project = ? AND from_entity = ? AND to_entity = ? AND relation_type = ?""",
            (PROJECT_ID, from_e, to_e, rel_type)
        )
        if cursor.fetchone():
            return
        
        self.conn.execute(
            """INSERT INTO relations (project, from_entity, to_entity, relation_type)
               VALUES (?, ?, ?, ?)""",
            (PROJECT_ID, from_e, to_e, rel_type)
        )
        self.conn.commit()
        self.stats["relations"] += 1
    
    def extract_deep_dive_details(self, filepath: str, ticker: str):
        """Extract structured analysis from deep dive."""
        print(f"\n🔍 Deep Dive: {ticker} ({filepath})")
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        date = re.search(r'(\d{8})', filepath)
        date = date.group(1) if date else "unknown"
        
        # 1. Competitive Moat
        moat_section = self._extract_section(content, "Competitive Moat")
        if moat_section:
            self.create_entity(
                f"{ticker}_Moat_{date}",
                "competitive_analysis",
                [
                    f"ticker={ticker}",
                    f"date={date}",
                    f"analysis_type=competitive_moat",
                    moat_section[:500],
                ],
                ["analysis", "competitive_moat", ticker, date]
            )
        
        # 2. TAM Sizing
        tam_section = self._extract_section(content, "TAM")
        if tam_section:
            # Extract numbers
            tam_match = re.search(r'\$?([\d.]+)([BMT])', tam_section)
            tam_value = f"${tam_match.group(1)}{tam_match.group(2)}" if tam_match else "N/A"
            
            self.create_entity(
                f"{ticker}_TAM_{date}",
                "market_sizing",
                [
                    f"ticker={ticker}",
                    f"date={date}",
                    f"tam={tam_value}",
                    tam_section[:300],
                ],
                ["analysis", "tam", ticker, date]
            )
        
        # 3. Risk Assessment
        risk_section = self._extract_section(content, "Risk")
        if risk_section:
            # Extract specific risks
            risks = re.findall(r'[-•]\s*\*\*(.*?)\*\*:(.*?)(?=\n[-•]|\n\n|$)', risk_section, re.DOTALL)
            risk_obs = [f"ticker={ticker}", f"date={date}"]
            for risk_name, risk_desc in risks[:5]:
                risk_obs.append(f"{risk_name.strip()}: {risk_desc.strip()[:100]}")
            
            if len(risk_obs) > 2:
                self.create_entity(
                    f"{ticker}_Risks_{date}",
                    "risk_analysis",
                    risk_obs,
                    ["analysis", "risks", ticker, date]
                )
        
        # 4. Valuation
        val_section = self._extract_section(content, "Valuation")
        if val_section:
            # Extract target price
            target_match = re.search(r'Target.*?\$?([\d,]+)', val_section)
            target = target_match.group(1) if target_match else "N/A"
            
            # Extract method (DCF, P/E, etc.)
            method_match = re.search(r'(DCF|P/E|EV/EBITDA|Revenue Multiple)', val_section)
            method = method_match.group(1) if method_match else "N/A"
            
            self.create_entity(
                f"{ticker}_Valuation_{date}",
                "valuation_analysis",
                [
                    f"ticker={ticker}",
                    f"date={date}",
                    f"target_price=${target}",
                    f"method={method}",
                    val_section[:400],
                ],
                ["analysis", "valuation", ticker, date]
            )
        
        # 5. Thesis Summary
        thesis_match = re.search(r'## Executive Summary(.*?)(?=\n##)', content, re.DOTALL)
        if thesis_match:
            thesis = thesis_match.group(1).strip()[:500]
            self.create_entity(
                f"{ticker}_Thesis_{date}",
                "investment_thesis",
                [
                    f"ticker={ticker}",
                    f"date={date}",
                    thesis,
                ],
                ["thesis", ticker, date]
            )
            
            # Relation: Thesis → Company
            self.create_relation(f"{ticker}_Thesis_{date}", ticker, "analyzes")
    
    def extract_graph_insights(self, filepath: str):
        """Extract structured metrics from graph insights."""
        print(f"\n📊 Graph Insights: {filepath}")
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        date = re.search(r'(\d{8})', filepath)
        date = date.group(1) if date else "unknown"
        
        # 1. Theme Momentum
        theme_table = re.search(r'\|\s*Theme\s*\|.*?\n((?:\|.*?\n)+)', content, re.MULTILINE)
        if theme_table:
            themes = []
            for line in theme_table.group(1).split('\n')[:11]:  # Top 10 themes
                match = re.search(r'\|\s*\*?\*?([\w\s-]+)\*?\*?\s*\|\s*([\d.]+)', line)
                if match:
                    theme_name = match.group(1).strip()
                    conviction = match.group(2)
                    themes.append(f"{theme_name}:{conviction}")
            
            if themes:
                self.create_entity(
                    f"Theme_Momentum_{date}",
                    "pipeline_metric",
                    [f"date={date}", f"metric_type=theme_momentum"] + themes,
                    ["pipeline", "theme_momentum", date]
                )
        
        # 2. Discovery Pipeline Metrics
        pipeline_match = re.search(r'Total Discoveries.*?(\d+)', content)
        deep_dive_match = re.search(r'Deep Dive.*?(\d+)', content)
        conversion_match = re.search(r'conversion.*?([\d.]+%)', content, re.IGNORECASE)
        
        if pipeline_match and deep_dive_match:
            self.create_entity(
                f"Pipeline_Metrics_{date}",
                "pipeline_metric",
                [
                    f"date={date}",
                    f"metric_type=discovery_pipeline",
                    f"total_discoveries={pipeline_match.group(1)}",
                    f"deep_dives={deep_dive_match.group(1)}",
                    f"conversion_rate={conversion_match.group(1) if conversion_match else 'N/A'}",
                ],
                ["pipeline", "metrics", date]
            )
        
        # 3. Research Gaps
        gaps_section = self._extract_section(content, "Research Gaps")
        if gaps_section:
            gap_entities = re.findall(r'\*\*([\w]+)\*\*.*?—(.*?)(?=\n\*\*|\n\n|$)', gaps_section, re.DOTALL)
            for ticker, description in gap_entities[:5]:
                self.create_entity(
                    f"Research_Gap_{ticker}_{date}",
                    "research_gap",
                    [
                        f"ticker={ticker}",
                        f"date={date}",
                        description.strip()[:200],
                    ],
                    ["research_gap", ticker, date]
                )
    
    def extract_tilt_rationales(self, filepath: str):
        """Extract position rationales from tilt reports."""
        print(f"\n💼 Tilts: {filepath}")
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        date = re.search(r'(\d{8})', filepath)
        date = date.group(1) if date else "unknown"
        
        # Extract table rows
        table_rows = re.findall(
            r'\|\s*([A-Z]{2,5})\s*\|.*?\|\s*([\d.]+)%.*?\|\s*\*\*([\d.]+)\*\*\s*\|\s*\*\*([\d.]+)\*\*.*?\|\s*(.*?)\s*\|',
            content
        )
        
        for ticker, weight, conviction, entry, rationale in table_rows[:15]:
            self.create_entity(
                f"Tilt_Rationale_{ticker}_{date}",
                "position_rationale",
                [
                    f"ticker={ticker}",
                    f"date={date}",
                    f"target_weight={weight}%",
                    f"conviction={conviction}",
                    f"entry_price=${entry}",
                    f"rationale={rationale.strip()[:300]}",
                ],
                ["tilt", "rationale", ticker, date]
            )
            
            # Relation: Rationale → Company
            self.create_relation(f"Tilt_Rationale_{ticker}_{date}", ticker, "justifies")
    
    def _extract_section(self, content: str, header: str) -> str:
        """Extract markdown section."""
        pattern = rf'##+ {header}(.*?)(?=\n##|\Z)'
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        return match.group(1).strip() if match else ""
    
    def run(self):
        """Process all files."""
        print("=" * 60)
        print("🎯 FINAL EXTRACTION - EVERYTHING INTO GRAPH")
        print("=" * 60)
        
        # 1. Deep Dives
        for root, dirs, files in os.walk("../research/deep_dives"):
            for file in files:
                if file.endswith(".md"):
                    ticker = os.path.basename(root)
                    self.extract_deep_dive_details(os.path.join(root, file), ticker)
        
        # 2. Graph Insights
        for file in os.listdir("../insights/graph"):
            if file.endswith(".md"):
                self.extract_graph_insights(f"../insights/graph/{file}")
        
        # 3. Tilts
        for file in os.listdir("../decisions/tilts"):
            if file.endswith(".md"):
                self.extract_tilt_rationales(f"../decisions/tilts/{file}")
        
        print("\n" + "=" * 60)
        print(f"✅ Entities Created: {self.stats['entities']}")
        print(f"✅ Relations Created: {self.stats['relations']}")

if __name__ == "__main__":
    import sys
    dry_run = "--live" not in sys.argv
    
    if dry_run:
        print("🔍 DRY RUN MODE (use --live to execute)\n")
    else:
        print("⚠️  LIVE MODE - Writing to database!\n")
    
    extractor = FinalExtractor(dry_run=dry_run)
    extractor.run()



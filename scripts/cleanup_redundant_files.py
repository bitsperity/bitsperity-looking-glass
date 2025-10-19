#!/usr/bin/env python3
"""
Delete files that are 100% in the Knowledge Graph.

SAFE TO DELETE:
- Discovery JSONs (candidates + summaries) ✓
- Conviction Ledgers (JSONL) ✓
- Execution Logs (JSONL) ✓
- BTC Alpha Tracking (JSONL) ✓

KEEP (not fully extracted):
- Daily Memos (Markdown) - complex, keep as backup
- Deep Dives (Markdown) - complex, keep as backup
- Portfolio Tilts (Markdown) - keep for human readability
"""

import shutil
from pathlib import Path

def cleanup():
    files_to_delete = []
    
    # 1. Discovery JSONs (100% in graph as discovery_candidate entities)
    files_to_delete.extend(Path("discovery/sector_rotation").glob("candidates-*.json"))
    files_to_delete.extend(Path("discovery/sector_rotation").glob("sector-summary-*.json"))
    
    # 2. Conviction Ledgers (100% in graph as conviction_entry entities)
    files_to_delete.extend(Path("convictions").glob("*_ledger.jsonl"))
    
    # 3. Execution Logs (100% in graph as trade_execution entities)
    files_to_delete.extend(Path("execution/logs").glob("*.jsonl"))
    
    # 4. BTC Alpha Tracking (100% in graph as btc_alpha_entry entities)
    files_to_delete.extend(Path("btc_accounting").glob("alpha_tracking.jsonl"))
    
    # Create backup directory
    backup_dir = Path("_backup_before_graph_migration")
    backup_dir.mkdir(exist_ok=True)
    
    print("🗑️  CLEANUP: Moving redundant files to backup\n")
    print("="*60)
    
    for file_path in files_to_delete:
        if not file_path.exists():
            continue
        
        # Create backup subdirectory structure
        rel_path = file_path.relative_to(".")
        backup_path = backup_dir / rel_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Move to backup
        shutil.move(str(file_path), str(backup_path))
        print(f"  ✅ Moved: {file_path} → {backup_path}")
    
    print("="*60)
    print(f"\n📦 Backup Location: {backup_dir}")
    print("💡 You can delete this backup after verifying the graph works!")

if __name__ == "__main__":
    cleanup()



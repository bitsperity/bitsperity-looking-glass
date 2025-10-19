# Knowledge Graph — Persistent Storage

Dieser Ordner enthält die persistente SQLite-Datenbank für den Knowledge Graph MCP.

## Inhalt

- `knowledgegraph.db` — SQLite-Datenbank (auto-created beim ersten Start)
- Backups (optional, später)

## Schema

### Entities (Nodes)
- Companies, Technologies, Themes, Events, Theses
- Observations (Facts)
- Tags (Status, Sector, Geography)

### Relations (Edges)
- supplier, customer, competitor, tailwind, owns, exposure, impacts, updates

## Zugriff

Nur via MCP (Knowledge Graph Server):
- In Cursor Chat: MCP-Tools nutzen
- Direkt: `sqlite3 knowledgegraph.db` (read-only empfohlen)

## Backup

```bash
# Manual Backup
cp knowledgegraph.db knowledgegraph.db.backup-$(date +%Y%m%d)

# Automated (später via cron/script)
```

## Größe

- Start: ~0 KB (leer)
- Nach 100 Deep Dives: ~500 Nodes, ~2000 Edges → ca. 2-5 MB
- Nach 1 Jahr: ~5000 Nodes, ~20000 Edges → ca. 20-50 MB

## Performance

SQLite ist ausreichend für:
- < 100k Nodes
- < 1M Edges
- Single-User (Cursor)

Falls später Multi-User oder > 100k Nodes → PostgreSQL Migration (MCP unterstützt beides).


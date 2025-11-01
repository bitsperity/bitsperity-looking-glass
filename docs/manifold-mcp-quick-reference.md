# Manifold MCP - Quick Reference

## Tool-Übersicht

### Health & Configuration
| Tool | Beschreibung | Parameter |
|------|--------------|-----------|
| `mf-get-health` | API & Qdrant Health-Check | - |
| `mf-get-config` | System-Konfiguration | - |
| `mf-get-device` | GPU/CPU-Info | - |

### Thoughts CRUD
| Tool | Beschreibung | Parameter |
|------|--------------|-----------|
| `mf-create-thought` | Thought erstellen (auto-embedding) | `type`, `title?`, `content?`, `summary?`, `tickers?`, `tags?`, `session_id?`, `workspace_id?`, `parent_id?` |
| `mf-get-thought` | Thought abrufen | `id` |
| `mf-patch-thought` | Thought aktualisieren (auto-reembed) | `id`, `patch` |
| `mf-delete-thought` | Thought löschen (soft/hard) | `id`, `soft?` |
| `mf-get-thought-children` | Children abrufen | `id` |
| `mf-get-thought-tree` | Vollständiger Kontext | `thought_id`, `depth?` |

### Search & Discovery
| Tool | Beschreibung | Parameter |
|------|--------------|-----------|
| `mf-search` | Semantische Suche | `query?`, `vector_type?`, `include_content?`, `filters?`, `boosts?`, `diversity?`, `limit?`, `offset?` |
| `mf-timeline` | Zeitliche Darstellung | `from_dt?`, `to_dt?`, `days?`, `bucket?`, `type?`, `tickers?`, `session_id?`, `workspace_id?` |
| `mf-stats` | Aggregierte Statistiken | `tickers?`, `timeframe?`, `session_id?`, `workspace_id?` |
| `mf-get-similar` | Ähnliche Thoughts (KNN) | `thought_id`, `k?` |
| `mf-check-duplicate` | Duplikat-Prüfung | `title?`, `summary?`, `content?`, `threshold?` |

### Relations
| Tool | Beschreibung | Parameter |
|------|--------------|-----------|
| `mf-link-related` | Relation erstellen | `thought_id`, `payload: {related_id, relation_type?, weight?}` |
| `mf-unlink-related` | Relation entfernen | `thought_id`, `related_id` |
| `mf-get-related` | Verwandte Thoughts | `thought_id`, `depth?` |
| `mf-related-facets` | Facet-Counts Nachbarschaft | `thought_id` |
| `mf-related-graph` | Subgraph um Thought | `thought_id`, `depth?` |

### Sessions
| Tool | Beschreibung | Parameter |
|------|--------------|-----------|
| `mf-list-sessions` | Alle Sessions | `limit?` |
| `mf-session-thoughts` | Thoughts einer Session | `session_id`, `limit?`, `include_content?` |
| `mf-session-graph` | Graph einer Session | `session_id`, `limit?` |
| `mf-session-summary` | Session-Zusammenfassung | `session_id` |
| `mf-upsert-session-summary` | Summary erstellen/updaten | `session_id`, `title?`, `summary?`, `content?` |

### Workspaces
| Tool | Beschreibung | Parameter |
|------|--------------|-----------|
| `mf-list-workspaces` | Alle Workspaces | `limit?` |
| `mf-workspace-thoughts` | Thoughts eines Workspaces | `workspace_id`, `limit?`, `include_content?` |
| `mf-workspace-graph` | Graph eines Workspaces | `workspace_id`, `limit?` |
| `mf-workspace-summary` | Workspace-Zusammenfassung | `workspace_id` |
| `mf-upsert-workspace-summary` | Summary erstellen/updaten | `workspace_id`, `title?`, `summary?`, `content?` |

### Graph & Analytics
| Tool | Beschreibung | Parameter |
|------|--------------|-----------|
| `mf-graph` | Globaler Graph-Überblick | `limit?`, `type?`, `status?`, `tickers?`, `session_id?`, `workspace_id?` |
| `mf-get-statistics` | Umfassende Statistiken | `session_id?` |
| `mf-get-graph-metrics` | Graph-Metriken | `session_id?` |
| `mf-get-overview` | Statistics + Metrics | `session_id?` |
| `mf-get-relation-timeline` | Relation-Timeline | `session_id?` |

### Quality Management
| Tool | Beschreibung | Parameter |
|------|--------------|-----------|
| `mf-quarantine-thought` | Thought quarantinen | `thought_id`, `reason?` |
| `mf-bulk-quarantine` | Mehrere quarantinen | `ids[]`, `reason?` |
| `mf-get-duplicate-warnings` | Duplikate finden | `threshold?`, `limit?`, `session_id?`, `workspace_id?` |
| `mf-get-trash` | Soft-Deleted Thoughts | - |
| `mf-restore-trash` | Thought wiederherstellen | `thought_id` |

### Admin & Maintenance
| Tool | Beschreibung | Parameter |
|------|--------------|-----------|
| `mf-reembed-thought` | Vektoren neu berechnen | `thought_id`, `body: {vectors?}` |
| `mf-bulk-reembed` | Mehrere re-embedden | `ids[]`, `vectors?` |
| `mf-reindex` | Vollständige Neuindizierung | `dry_run?`, `filters?` |
| `mf-dedupe` | Semantic Deduplication | `strategy?`, `filters?`, `threshold?` |
| `mf-bulk-promote` | Mehrere promoten | `ids[]` |
| `mf-get-history` | Versions-Historie | `thought_id` |
| `mf-explain-search` | Search-Scoring erklären | `query`, `filters?`, `limit?` |
| `mf-get-statistics` | Umfassende Statistiken | `session_id?` |

### Promotion
| Tool | Beschreibung | Parameter |
|------|--------------|-----------|
| `mf-promote-thought` | Zu Ariadne KG promoten | `thought_id`, `body: {auto_mark?}` |
| `mf-sync-ariadne` | Ariadne-Status syncen | `thought_id`, `ariadne_fact_id?`, `ariadne_entity_ids?`, `status?` |

---

## Häufige Workflows

### 1. Thought erstellen mit Qualitätsprüfung
```
1. mf-check-duplicate(title, summary) → Prüft Duplikate
2. mf-create-thought({type, title, content, summary, tickers, session_id}) → Erstellt
3. mf-search(query: "similar", limit: 5) → Findet ähnliche
4. mf-link-related(thought_id, related_id, type: "related") → Verlinkt
```

### 2. Wissens-Exploration
```
1. mf-search(query, include_content: false) → Schnelle Übersicht
2. mf-get-thought-tree(thought_id, depth: 2) → Vollständiger Kontext
3. mf-get-similar(thought_id, k: 10) → Ähnliche Thoughts
4. mf-get-related(thought_id, depth: 2) → Verknüpfte Thoughts
5. mf-timeline(tickers, days: 30) → Zeitliche Entwicklung
```

### 3. Session-Management
```
1. mf-create-thought({type: "session", session_id: "uuid"}) → Session-Root
2. mf-create-thought({type, title, session_id: "uuid"}) → Thoughts hinzufügen
3. mf-session-thoughts(session_id) → Alle Thoughts
4. mf-session-graph(session_id) → Graph-Visualisierung
5. mf-upsert-session-summary(session_id, summary) → Zusammenfassung
```

### 4. Qualitäts-Management
```
1. mf-get-duplicate-warnings(threshold: 0.92) → Duplikate finden
2. mf-quarantine-thought(thought_id, reason) → Markieren
3. mf-get-trash() → Gelöschte reviewen
4. mf-restore-trash(thought_id) → Wiederherstellen
5. mf-get-statistics() → Nach-Bereinigung verifizieren
```

### 5. Graph-Analyse
```
1. mf-graph(limit: 500) → Globaler Überblick
2. mf-get-graph-metrics() → Metriken berechnen
3. mf-get-related(thought_id, depth: 2) → Wichtige Knoten
4. mf-link-related(thought_id, related_id) → Lücken schließen
5. mf-get-overview() → System-Gesundheit
```

---

## Quick Tips

### Performance
- ✅ `include_content: false` für schnelle Suche
- ✅ `vector_type: "summary"` für schnellste Suche
- ✅ `limit: 20-50` statt 200 für schnellere Ergebnisse
- ✅ Bulk-Operationen statt einzelne Calls

### Best Practices
- ✅ Immer `mf-check-duplicate` vor Erstellung
- ✅ `type` immer explizit setzen
- ✅ `summary` sollte < 280 Zeichen sein
- ✅ `tickers` und `tags` für Filterbarkeit
- ✅ Soft-Delete bevorzugen (Wiederherstellung möglich)

### Relation-Typen
- `supports`: Thought unterstützt einen anderen
- `contradicts`: Thought widerspricht einem anderen
- `followup`: Thought ist Nachfolger
- `duplicate`: Thought ist Duplikat
- `related`: Allgemeine Verwandtschaft

### Vector-Typen
- `summary`: Schnell, gute Übersicht (Default)
- `title`: Für präzise Titel-Matches
- `text`: Für detaillierte Content-Suche (langsamer)

### Session vs Workspace
- **Session**: Temporär (Stunden/Tage), für Arbeitseinheiten
- **Workspace**: Langlebig (Wochen/Monate), für Projekte/Themen

---

## Fehlerbehandlung

| Fehler | Lösung |
|--------|--------|
| 404 Not Found | `mf-search` statt `mf-get-thought` |
| 500 Server Error | `mf-get-health` für System-Status |
| Timeout | Limit reduzieren oder Operation aufteilen |
| 400 Bad Request | Schema prüfen, Required Fields setzen |

---

## Typische Parameter-Werte

### Search
```typescript
// Schnelle Übersicht
{query: "Tesla", include_content: false, vector_type: "summary", limit: 20}

// Detaillierte Suche
{query: "Tesla revenue analysis", include_content: true, vector_type: "text", limit: 50}

// Filter-basiert
{query: "", filters: {must: [{field: "type", op: "match", value: "fact"}]}, limit: 100}
```

### Timeline
```typescript
// Letzte 30 Tage
{days: 30, bucket: "day"}

// Spezifischer Zeitraum
{from_dt: "2025-01-01T00:00:00Z", to_dt: "2025-01-31T23:59:59Z", bucket: "week"}

// Mit Filter
{tickers: "TSLA", days: 30, type: "analysis"}
```

### Relations
```typescript
// Standard-Verlinkung
{thought_id: "uuid-1", payload: {related_id: "uuid-2", relation_type: "related"}}

// Mit Gewichtung
{thought_id: "uuid-1", payload: {related_id: "uuid-2", relation_type: "supports", weight: 0.9}}
```

---

**Siehe auch**: [Vollständiges Manual](./manifold-mcp-manual.md)


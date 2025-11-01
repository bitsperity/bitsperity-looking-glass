# MCP Dokumentation

Willkommen zur Dokumentation der **MCP Server** (Model Context Protocol Server) für Finanz- und Wirtschaftsdaten.

## Verfügbare MCPs

### 📊 Satbase MCP (59 Tools)
Daten-Management für News, Macro, Prices, BTC und Ingestion.

**Dokumentation**:
- 📘 [Satbase MCP Manual](./satbase-mcp-manual.md) - Vollständiges Manual
- 📋 [Satbase MCP Quick Reference](./satbase-mcp-quick-reference.md) - Schnellreferenz

### 🧠 Ariadne MCP (70+ Tools)
Knowledge Graph für Trading Intelligence mit Neo4j. Graph-basierte Analyse, Hypothesis-Validation, Impact-Simulation.

**Dokumentation**:
- 📘 [Ariadne MCP Manual](./ariadne-mcp-manual.md) - Vollständiges Manual
- 📋 [Ariadne MCP Quick Reference](./ariadne-mcp-quick-reference.md) - Schnellreferenz

### 🔍 Tesseract MCP (11 Tools)
Semantische Suche über News-Artikel mit multilingualen Embeddings.

**Dokumentation**:
- 📘 [Tesseract MCP Manual](./tesseract-mcp-manual.md) - Vollständiges Manual
- 📋 [Tesseract MCP Quick Reference](./tesseract-mcp-quick-reference.md) - Schnellreferenz

### 🧠 Manifold MCP (~50 Tools)
Intelligentes Gedächtnissystem für KI-Agenten mit semantischer Suche, Graph-Relationen und umfassenden Analysemöglichkeiten.

**Dokumentation**:
- 📘 [Manifold MCP Manual](./manifold-mcp-manual.md) - Vollständiges Manual
- 📋 [Manifold MCP Quick Reference](./manifold-mcp-quick-reference.md) - Schnellreferenz

---

## Satbase MCP Dokumentation

### Satbase MCP

#### 📘 [Satbase MCP Manual](./satbase-mcp-manual.md)
**Vollständiges Manual** mit:
- System-Architektur und Mermaid-Diagrammen
- Detaillierte Beschreibung aller **59 Tools**
- Tool-Strategien und Best Practices
- Workflows für verschiedene Use Cases
- Erweiterte Nutzung und Optimierung

**Empfohlen für**: Tiefes Verständnis, Strategie-Entwicklung, Architektur-Überblick

#### 📋 [Satbase MCP Quick Reference](./satbase-mcp-quick-reference.md)
**Schnellreferenz** mit:
- Tool-Übersicht nach Kategorie
- Häufige Workflows mit Beispielen
- Parameter-Referenz
- Best Practices (DO/DON'T)
- Performance-Tipps

**Empfohlen für**: Tägliche Nutzung, Schnellnachschlagen, Code-Beispiele

### Coalescence MCP

#### 📘 [Coalescence MCP Manual](./coalescence-mcp-manual.md)
**Vollständiges Manual** mit:
- System-Architektur und Mermaid-Diagrammen
- Detaillierte Beschreibung aller **19 Tools**
- Agent-Lifecycle-Management
- Context-Management und Wissenspersistenz
- Agent-zu-Agent-Kommunikation
- Rule-Management und Wiederverwendbarkeit
- Tool-Strategien und Best Practices
- Erweiterte Nutzung und Optimierung

**Empfohlen für**: Multi-Agent-System-Verwaltung, Agent-Konfiguration, Orchestrierung

---

## Tesseract MCP Dokumentation

### 📘 [Tesseract MCP Manual](./tesseract-mcp-manual.md)
**Vollständiges Manual** mit:
- System-Architektur und Mermaid-Diagrammen
- Detaillierte Beschreibung aller **11 Tools**
- Multi-Vector Architecture Erklärung
- Semantic Search Strategien
- Collection Management & Versioning
- Embedding Operations & Best Practices

**Empfohlen für**: Tiefes Verständnis, Strategie-Entwicklung, Architektur-Überblick

### 📋 [Tesseract MCP Quick Reference](./tesseract-mcp-quick-reference.md)
**Schnellreferenz** mit:
- Tool-Übersicht nach Kategorie
- Häufige Workflows mit Beispielen
- Quality-Filtering Strategien
- Parameter-Referenz
- Best Practices (DO/DON'T)
- Performance-Tipps

**Empfohlen für**: Tägliche Nutzung, Schnellnachschlagen, Code-Beispiele

---

## Schnellstart

### 1. System-Status prüfen

```typescript
// Coverage-Übersicht
get-coverage()

// Health-Check
health-check()
```

### 2. Token-effiziente News-Lektüre

```typescript
// Phase 1: Discovery (schnell, günstig)
list-news({
  from: "2025-01-20",
  to: "2025-01-24",
  tickers: "NVDA",
  include_body: false,  // ← Wichtig für Token-Effizienz!
  limit: 50
})

// Phase 2: Selective Reading
list-news({
  from: "2025-01-23",
  to: "2025-01-24",
  tickers: "NVDA",
  include_body: true,
  content_format: "text",  // ← 2x günstiger als HTML
  limit: 10
})
```

### 3. Watchlist-Management

```typescript
// Ticker hinzufügen
add-watchlist({
  items: [{
    type: "stock",
    key: "NVDA",
    label: "NVIDIA",
    enabled: true
  }]
})

// Refresh triggern
watchlist-refresh({
  prices: true,
  news: true
})

// Jobs monitoren
list-jobs({ status: "running" })
```

---

## Tool-Kategorien (59 Tools)

| Kategorie | Anzahl | Haupt-Tools |
|-----------|--------|-------------|
| **Status & Health** | 2 | `get-coverage`, `health-check` |
| **News** | 9 | `list-news`, `news-heatmap`, `bulk-news` |
| **Macro** | 5 | `fred-search`, `fred-observations` |
| **Prices** | 5 | `list-prices`, `prices-search` |
| **BTC** | 3 | `btc-oracle`, `usd-to-btc` |
| **Ingest** | 5 | `enqueue-news`, `news-backfill` |
| **Jobs** | 7 | `list-jobs`, `get-job` |
| **Watchlist** | 6 | `get-watchlist`, `add-watchlist` |
| **Topics** | 7 | `get-topics`, `topics-stats` |
| **Admin** | 12 | `news-gaps`, `cleanup-junk-bodies` |

---

## Häufige Workflows

### Research-Workflow
1. `get-coverage()` → Übersicht
2. `list-news(include_body=false)` → Discovery
3. `list-news(include_body=true, content_format="text")` → Relevante Artikel
4. `list-prices()` → Preisdaten
5. `fred-observations()` → Makro-Kontext

### Daten-Management-Workflow
1. `add-watchlist()` → Ticker hinzufügen
2. `watchlist-refresh()` → Ingestion triggern
3. `list-jobs()` → Jobs monitoren
4. `get-coverage()` → Verifizieren

### Qualitätskontrolle-Workflow
1. `news-metrics()` → Metriken prüfen
2. `news-gaps()` → Lücken finden
3. `cleanup-junk-bodies(dry_run=true)` → Cleanup planen
4. `news-backfill()` → Lücken schließen

---

## Wichtige Konzepte

### Token-Effizienz
Der Satbase MCP bietet **granulare Kontrolle** über Content-Retrieval:

- **Discovery**: `include_body=false` → Nur Metadaten (schnell, günstig)
- **Text-Only**: `content_format="text"` → ~50% Token-Ersparnis
- **HTML-Only**: `content_format="html"` → Für DOM-Parsing
- **Full Content**: `include_body=true` → Maximum Flexibilität

### Asynchrone Jobs
Alle Ingestion-Operationen laufen **asynchron**:

- `enqueue-*` Tools geben sofort `job_id` zurück
- Jobs laufen im Hintergrund
- Monitoring via `list-jobs()` und `get-job()`
- **Nicht blockieren** - Agent kann weiterarbeiten

### Watchlist-System
**Watchlist** ermöglicht kontinuierliche Überwachung:

- Ticker/Topics/Makro-Indikatoren hinzufügen
- Automatische Ingestion (via Scheduler)
- Manueller Refresh möglich
- Expiration-Dates unterstützt

---

## Best Practices

### ✅ DO

- **Immer `get-coverage` zuerst** - Verstehe verfügbare Daten
- **Token-effizient**: Phasen-Ansatz für News
- **Watchlist verwenden** - Für kontinuierliche Überwachung
- **Jobs asynchron monitoren** - Nicht blockieren
- **`dry_run=true` zuerst** - Bei Cleanup-Operationen

### ❌ DON'T

- **Nicht `include_body=true` ohne Grund** - Teuer!
- **Nicht Jobs synchron warten** - Nutze `list-jobs` in Schleife
- **Nicht `dry_run=false` ohne Review** - Gefährlich!
- **Nicht große Date Range ohne Limit** - Langsam

---

## Support & Links

- **Backend API**: `http://localhost:8080`
- **MCP Server**: Stdio Transport (Cursor IDE)
- **Codebase**: `/home/sascha-laptop/alpaca-bot/mcps/satbase`
- **Backend**: `/home/sascha-laptop/alpaca-bot/apps/satbase_api`

---

## Changelog

### Version 1.0.0 (2025-01-24)
- ✅ Vollständige Dokumentation aller 59 Tools
- ✅ Mermaid-Diagramme für Architektur und Workflows
- ✅ Tool-Strategien und Best Practices
- ✅ Quick Reference für tägliche Nutzung

---

## Weiterführende Dokumentation

### Satbase MCP
- [Satbase MCP Manual](./satbase-mcp-manual.md) - Vollständiges Manual
- [Satbase MCP Quick Reference](./satbase-mcp-quick-reference.md) - Schnellreferenz

### Tesseract MCP
- [Tesseract MCP Manual](./tesseract-mcp-manual.md) - Vollständiges Manual
- [Tesseract MCP Quick Reference](./tesseract-mcp-quick-reference.md) - Schnellreferenz

### Ariadne MCP
- [Ariadne MCP Manual](./ariadne-mcp-manual.md) - Vollständiges Manual
- [Ariadne MCP Quick Reference](./ariadne-mcp-quick-reference.md) - Schnellreferenz

### Manifold MCP
- [Manifold MCP Manual](./manifold-mcp-manual.md) - Vollständiges Manual
- [Manifold MCP Quick Reference](./manifold-mcp-quick-reference.md) - Schnellreferenz


# Ariadne Frontend – Implementation Summary

## Übersicht

Das Ariadne-Frontend ist eine vollständige SvelteKit-basierte UI für die Ariadne Knowledge Graph API. Es folgt SOLID-Prinzipien und ist backend-getrieben (keine Businesslogik im Frontend).

## Implementierte Komponenten

### 1. Konfiguration

- **`apps/looking_glass/src/routes/+layout.ts`**: Globaler Layout-Loader mit `apiBaseAriadne` aus `VITE_ARIADNE_API_BASE` (Default: `http://127.0.0.1:8082`)
- **Sidebar**: Neuer Link "Ariadne" in `apps/looking_glass/src/lib/components/layout/Sidebar.svelte`

### 2. Types & API Client

- **`apps/looking_glass/src/lib/types/ariadne.ts`**: Vollständige TypeScript-Interfaces für alle Ariadne-Datenmodelle:
  - `Node`, `Edge`, `Subgraph`
  - `Event`, `PriceEvent`
  - `Pattern`, `Regime`, `Hypothesis`, `Evidence`
  - Request/Response-Typen für alle Endpoints
  
- **`apps/looking_glass/src/lib/api/ariadne.ts`**: API-Client mit Funktionen für alle 26+ Endpoints:
  - **Read**: Context, Impact, Timeline, Similar-Entities, Patterns, Regimes
  - **Write**: Fact, Observation, Hypothesis
  - **Validate**: Evidence, Validation, Pending-Validations
  - **Learn**: Correlation, Community Detection
  - **Ingest**: Price Ingestion
  - **Admin**: Stats, Node/Edge CRUD, Cleanup

### 3. Service Layer

- **`apps/looking_glass/src/lib/services/ariadneService.ts`**: Orchestrierung von Use-Cases:
  - `fetchDashboard()`: Health + Stats + Pending Validations
  - `searchEntities()`, `fetchContext()`, `fetchTimeline()`, etc.
  - `resolveTickerToId()`: Utility für Ticker → Neo4j elementId Auflösung

### 4. Shared Components

Alle in `apps/looking_glass/src/lib/components/ariadne/`:

- **Badges**: `LabelBadge`, `RelTypeBadge`, `ConfidenceBadge`
- **Cards**: `KpiCard`, `NodeCard`, `EventCard`, `PatternCard`, `RegimeCard`
- **Navigation**: `AriadneNav.svelte` (13 Tabs)

### 5. Routen

Alle in `apps/looking_glass/src/routes/ariadne/`:

| Route | Status | Beschreibung |
|-------|--------|--------------|
| `/dashboard` | ✅ Complete | KPIs, Health, Stats, Pending Validations |
| `/search` | ✅ Complete | Topic/Ticker-Suche mit Facets, Debounce |
| `/timeline` | ✅ Complete | Events/PriceEvents/Relations Tabs |
| `/patterns` | ✅ Complete | Pattern-Liste mit Filtern |
| `/patterns/[id]` | 🚧 Stub | Pattern-Detail + Occurrences |
| `/hypotheses` | ✅ Complete | Pending Validations Queue |
| `/hypotheses/[id]` | 🚧 Stub | Evidence/Validate Interface |
| `/write` | ✅ Complete | Fact/Observation/Hypothesis Forms |
| `/learn` | ✅ Complete | Correlation + Community Detection Trigger |
| `/admin` | ✅ Complete | Detailed Stats + Orphan Cleanup |
| `/context` | 🚧 Stub | Context Subgraph (Sigma.js TBD) |
| `/graph` | 🚧 Stub | Birdview Explorer (Sigma.js TBD) |
| `/impact` | ✅ Complete | Event Impact Analysis mit Rangliste |
| `/similar` | ✅ Complete | Similar Entities mit Weighted Jaccard/GDS |
| `/regimes` | ✅ Complete | Current + Similar Regimes Search |

## Design-Prinzipien

- **Dark Theme**: Neutral-950 Hintergrund, AA+ Kontrast
- **Card-basiert**: Konsistente Border/Rounded/Padding
- **Responsive**: Grid Layouts, scrollbare Listen
- **Progressive Disclosure**: Wichtige Infos sofort, Details in Tabs/Modals
- **Farbcodierung**: Label → Farbe (Company=Blue, Event=Red, etc.), RelType → Farbe

## Backend-Alignment

Das Frontend toleriert Backend-Inkonsistenzen:

- **IDs**: Nutzt durchgängig `elementId` (string); in Write-Forms muss User Neo4j-elementIds angeben
- **Event-Properties**: Zeigt `title || name` (Backend nutzt beides)
- **RelTypes**: Mappt `CORRELATES_WITH` ↔ `CORRELATED_WITH`
- **PriceEvent-Relationen**: Unterstützt `HAS_PRICE_EVENT` und `PRICE_EVENT_OF`

## Nächste Schritte (Offene TODOs)

1. **Context/Graph**: Sigma.js-Integration mit ForceAtlas2, Maskierung, Temporal-Filter, Explore-Funktionen
2. **Hypotheses Detail**: Evidence-Add, Validate/Invalidate/Defer UI mit Threshold-Bar
3. **Patterns Detail**: Occurrences-Timeline mit Filtering
4. **NodePreviewModal**: Shared Modal für Quick-Preview (wie Manifold)
5. **Playwright E2E**: Tests für alle Routen (Dashboard, Search, Timeline, etc.)

## Development

```bash
# Frontend starten (dev)
cd apps/looking_glass
npm run dev
# → http://localhost:3000/ariadne/dashboard

# Ariadne Backend muss laufen:
# → http://localhost:8082

# Environment Variable (optional):
export VITE_ARIADNE_API_BASE=http://127.0.0.1:8082
```

## Architektur-Diagramm

```
┌─────────────────────────────────────────────────────┐
│  UI Layer (Svelte Components)                       │
│  - Dashboard, Search, Timeline, etc.                │
│  - Badges, Cards, Modals                            │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  Service Layer (ariadneService.ts)                  │
│  - Use-Case Orchestrierung                          │
│  - Data Transformation                              │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  API Client (ariadne.ts)                            │
│  - HTTP-Calls                                       │
│  - Type-Safe Endpoints                              │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  Ariadne Backend (FastAPI)                          │
│  - Neo4j Knowledge Graph                            │
│  - Read/Write/Validate/Learn/Admin                  │
└─────────────────────────────────────────────────────┘
```

## Testing

Placeholder für E2E-Tests (TODO):

```typescript
// tests/ariadne/dashboard.spec.ts
test('Dashboard zeigt KPIs und Pending Validations', async ({ page }) => {
  await page.goto('/ariadne/dashboard');
  await expect(page.locator('h1')).toContainText('Ariadne Dashboard');
  // ...
});
```

## Changelog

- **2025-01-23**: Initial Implementation
  - Setup: Env, Types, API Client, Service Layer
  - Components: Badges, Cards, Navigation
  - Pages: Dashboard, Search, Timeline, Patterns, Hypotheses, Write, Learn, Admin (complete)
  - Pages: Context, Graph, Impact, Similar, Regimes (stubs)


Ich lese jetzt systematisch alle wichtigen Manifold-Frontend-Dateien, um die finale Vision zu erstellen.

[14 tools called]

Perfekt. Ich habe jetzt den kompletten Überblick. Lass mich die **finale Vision** erstellen – **kein Bloat, 100% Backend-Utilisierung, Coalescence-Design, sauber strukturiert**.

## MANIFOLD FRONTEND V2 – FINALE VISION

### IST-STAND (Probleme)
- **Dashboard**: KPIs okay, aber Sessions/Workspaces unsichtbar, keine Duplicate-Warnings-Anzeige
- **Search**: Solide, aber **vector_type** + **include_content** nicht steuerbar, keine Session-Filter
- **Timeline**: Minimal, keine Session-Gruppierung
- **Thoughts**: Liste/Create, aber **Versionen**, **Children** und **Tree** fehlen komplett
- **Graph**: Gut (Sigma), aber **session_id/workspace_id** Filter fehlen, **parent-child edges** (section-of) nicht visualisiert
- **Admin**: Reindex + Trash okay, aber **Duplicate Warnings** UI fehlt
- **API Client**: Neue Endpoints fehlen (`/sessions`, `/session/{id}/thoughts`, `/session/{id}/graph`, `/children`, `/tree`, `/check-duplicate`, `/warnings/duplicates`)
- **Design**: Funktional, aber kein Coalescence (Glasmorphism/Gradienten)

---

### BACKEND-FEATURES (100% utilisieren)

#### 1. **Multi-Vector Search** (text, title, summary)
- Backend: `search(vector_type="summary"|"text"|"title")`
- Frontend: Toggle/Selector in Search

#### 2. **2-Phase Retrieval** (Token-Effizienz)
- Backend: `search(include_content=false)` → nur `id, title, summary, type, tickers, score`
- Frontend: "Cheap Mode" Switch in Search → Phase 1: Summary-Only List, Phase 2: On-Demand Content-Load

#### 3. **Sessions/Workspaces**
- Backend: `GET /sessions`, `GET /session/{id}/thoughts`, `GET /session/{id}/graph`, `GET /session/{id}/summary`, `POST /session/{id}/summary`
- Frontend:
  - **Dashboard**: Sessions-Panel mit Cards (count, types, last_updated)
  - **Search/Timeline/Graph**: Session-Filter (Dropdown)
  - **Neue Tab "Sessions"**: Liste → Click → Filtered Search/Graph/Timeline

#### 4. **Parent-Child / Tree**
- Backend: `GET /thought/{id}/children`, `GET /thought/{id}/tree`
- Frontend:
  - **Thoughts Detail**: Tree-View Tab (expandable tree)
  - **Graph**: `section-of` edges (feine graue Linien, Parent→Child)

#### 5. **Versioning**
- Backend: `versions[]` Array in Envelope
- Frontend: **Thoughts Detail**: Version-History Tab (Diff-View, Timestamps, Snapshots)

#### 6. **Duplicate Warnings**
- Backend: `POST /check-duplicate`, `GET /warnings/duplicates`
- Frontend:
  - **Dashboard**: KPI "Duplicate Warnings" (count + link)
  - **Admin**: Warnings-Panel (Liste, Actions: Link as Duplicate, Soft Delete)

---

### DESIGN-SYSTEM (Coalescence 2.0)

#### Farben
- **Grund**: `bg-slate-950`, `bg-slate-900`
- **Glas-Panels**: `backdrop-blur-md`, `bg-white/5`, `border-white/10`, `shadow-xl`
- **Gradienten**: `from-indigo-600 to-violet-600`, `from-emerald-500 to-teal-500`
- **Akzente**: indigo-500 (primary), emerald-500 (success), amber-500 (warning), red-500 (danger)

#### Typografie
- **Font**: Inter/DM Sans
- **Sizes**: 12px (caption), 14px (body), 16px (subheading), 20px (heading), 32px (hero)
- **Weights**: 400 (normal), 600 (semibold), 700 (bold)

#### Spacing & Borders
- **Grid**: 8px (0.5rem), 12px, 16px, 24px, 32px
- **Radius**: 8px (default), 12px (cards), 16px (hero panels)

#### Motion
- **Transitions**: 150ms ease-out (hover), 200ms (modals)
- **Entrance**: fade+slide (y: -8px → 0)

#### Icons
- Lucide/Phosphor (2px stroke)

---

### TAB-BY-TAB VISION

---

## 1. **DASHBOARD** (Manifold Command Center)

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  Manifold · Dashboard                                   │
├─────────────────────────────────────────────────────────┤
│  [Nav]                                                   │
├─────────────────────────────────────────────────────────┤
│  ╔════════ KPIs (3 Cards, glassmorphic) ═════════╗     │
│  ║ Health ✓  │  Device 🚀 GPU  │  Thoughts 💭 12 ║     │
│  ╚══════════════════════════════════════════════════════╝     │
│  ╔════════ Sessions Panel (glassmorphic) ════════╗     │
│  ║  session-alpha  [8 thoughts]  [Bar: 3x obs, 5x ana] ║
│  ║  → Click → Filter Search/Graph                       ║
│  ║  session-beta   [5 thoughts]  [Bar: 2x hyp, 3x dec] ║
│  ╚══════════════════════════════════════════════════════╝     │
│  ╔════════ Duplicate Warnings (new) ═════════╗         │
│  ║  ⚠️ 3 potential duplicates detected                  ║
│  ║  [View Warnings →]                                   ║
│  ╚══════════════════════════════════════════════════════╝     │
│  ╔════════ Timeline Mini (last 14d sparkline) ═╗       │
│  ║  ▁▃▄▆█▆▄▃▂▁▂▃▅▇ (stacked by type)             ║       │
│  ╚══════════════════════════════════════════════════════╝     │
└─────────────────────────────────────────────────────────┘
```

### Key Features
- **Sessions Panel**: Cards mit Count, Type-Bars (stacked mini bar charts), Click → `/manifold/search?session_id={id}`
- **Duplicate Warnings KPI**: Count + Link zu Admin Warnings
- **Quick Actions**: "New Thought", "New Session", "Scan Duplicates"

---

## 2. **SEARCH** (2-Phase Retrieval + Multi-Vector)

### Controls (oberhalb Facets)
```
┌──────────────────────────────────────────────────┐
│ [Query ____________] [🔍 Search]                │
│ ┌──── Search Mode ────┐  ┌── Vector Type ──┐  │
│ │ ○ Full (heavy)      │  │ ○ Summary (fast)│  │
│ │ ● Cheap (summary)   │  │ ○ Text (full)   │  │
│ └─────────────────────┘  │ ○ Title (short) │  │
│                           └─────────────────┘  │
│ Session: [All ▾] │ Workspace: [All ▾]         │
└──────────────────────────────────────────────────┘
```

### Layout
```
┌──────────────────┬───────────────────────────────┬─────────────────┐
│ Facets (links)   │ Results (List)                │ Preview (sticky)│
│ • type           │ ┌─────────────────────────┐ │                 │
│ • status         │ │ [✓] Tesla Q4 Analysis   │ │ ╔═════════════╗ │
│ • session_id (new)│ │ Score: 0.92             │ │ ║ Title       ║ │
│ • workspace_id (new)│ │ summary > text > title │ │ ║ Summary     ║ │
│ • tickers        │ │ [Open] [Similar] [Tree] │ │ ║ Meta        ║ │
│ • sectors        │ └─────────────────────────┘ │ ║ [Actions]   ║ │
│                  │ ┌─────────────────────────┐ │ ╚═════════════╝ │
│ Timeline (14d)   │ │ [ ] Child: Revenue      │ │                 │
│ ▁▃▄█▆▄▃▂        │ │ Score: 0.89             │ │                 │
│                  │ │ [Expand Children]       │ │                 │
│                  │ └─────────────────────────┘ │                 │
└──────────────────┴───────────────────────────────┴─────────────────┘
```

### Key Features
- **Cheap Mode**: `include_content=false` → nur Title+Summary+Meta (50 tokens/result statt 500)
- **vector_type Selector**: summary (default), text, title
- **Session/Workspace Facets**: Clickable Filter
- **Preview Pane**: Sticky Right, zeigt Summary + Actions, Click "Open" → Full Content Load
- **Children Indicator**: Icon wenn `children_count > 0`, "Expand Children" Button

---

## 3. **TIMELINE** (Session-Gruppierung)

### Layout
```
┌──────────────────────────────────────────────────────┐
│ Filters: Session [All ▾] │ Type [All ▾] │ Date Range│
├──────────────────────────────────────────────────────┤
│ ╔════════ Brush Timeline (interactive) ═══════╗    │
│ ║ [████████████████████████████████████████] ║    │
│ ║  Jan        Feb        Mar        Apr      ║    │
│ ║  ↕ Drag to select range                    ║    │
│ ╚════════════════════════════════════════════════╝    │
│                                                      │
│ ┌────────── 2025-10-28 ──────────┐                │
│ │ session-alpha (5 thoughts)      │                │
│ │  • Tesla Q4 Analysis (analysis) │                │
│ │  • Revenue Growth (observation) │                │
│ │ session-beta (2 thoughts)       │                │
│ │  • Fed Rate Decision (hypothesis)│                │
│ └────────────────────────────────┘                │
└──────────────────────────────────────────────────────┘
```

### Key Features
- **Session-Gruppierung**: Thoughts grouped by `session_id` within each day
- **Brush**: D3-ähnlicher interaktiver Zeitbalken
- **CTA**: "Open in Graph" (mit identischem Filter)

---

## 4. **THOUGHTS** (Tree + Versionen)

### Layout
```
┌─────────────────────────────────────────────────────┐
│ [Create Thought] [Import]  Session: [alpha ▾]      │
├─────────────────────────────────────────────────────┤
│ ┌─ Thought: Tesla Q4 Analysis ────────────────┐  │
│ │ Tabs: [Details] [Tree] [Versions] [Relations]│  │
│ │ ────────────────────────────────────────────│  │
│ │ ╔═ Tree View ═══════════════════════════╗  │  │
│ │ ║ ● Tesla Q4 Analysis (parent)          ║  │  │
│ │ ║   ├─ Section 0: Revenue (ordinal 0)  ║  │  │
│ │ ║   ├─ Section 1: Margins (ordinal 1)  ║  │  │
│ │ ║   └─ Section 2: Outlook (ordinal 2)  ║  │  │
│ │ ║ [+ Add Child] [Reorder]               ║  │  │
│ │ ╚════════════════════════════════════════╝  │  │
│ │ ╔═ Versions ════════════════════════════╗  │  │
│ │ ║ v3 (current) 2025-10-28 14:23         ║  │  │
│ │ ║ v2           2025-10-27 09:15         ║  │  │
│ │ ║   Δ title: "Tesla Q4" → "Tesla Q4 Analysis" ║  │
│ │ ║   Δ confidence: 0.75 → 0.85            ║  │  │
│ │ ║ v1           2025-10-26 18:00 (created)║  │  │
│ │ ╚════════════════════════════════════════╝  │  │
│ └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Key Features
- **Tree Tab**: GET `/thought/{id}/tree` → hierarchical view (parent + children sorted by ordinal)
- **Versions Tab**: `versions[]` Array → Diff-View (changed fields highlighted)
- **Inline Edit**: Status, Confidence, Session

---

## 5. **GRAPH** (Sessions + Parent-Child + Semantische Kodierung)

### Layout
```
┌──────────────────────────────────────────────────────┐
│ [Search __] [🔍] Session:[All ▾] Workspace:[All ▾] │
│ Type:[All ▾] Status:[All ▾] Tickers:[____]        │
│ [Reload Graph]  Similarity Threshold: [▒▒▒▒▒░░] 0.7│
├──────────────────────────────────────────────────────┤
│ ┌────────── Canvas ──────────┬─ Right Sidebar ────┐│
│ │  🔵 obs     ⬡ hyp          │ ╔════════════════╗ ││
│ │   ↓ related  ↓ supports    │ ║ Node: Tesla Q4 ║ ││
│ │  ⬢ ana  ───→ ◆ dec         │ ║ Type: analysis ║ ││
│ │   ↓ section-of (fein grau) │ ║ Session: alpha ║ ││
│ │  ■ child-1                  │ ║ Confidence: 85%║ ││
│ │                             │ ║ [Children: 3]  ║ ││
│ │ Legend:                     │ ║ [Versions: 2]  ║ ││
│ │ ● obs ⬡ hyp ■ ana ◆ dec    │ ║ [Expand Similar]║ ││
│ │ ✦ refl △ que                │ ╚════════════════╝ ││
│ └────────────────────────────┴───────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### Semantische Kodierung

#### Node Shape (by type)
- observation: ● (circle)
- hypothesis: ⬡ (hexagon)
- analysis: ■ (square)
- decision: ◆ (diamond)
- reflection: ✦ (star)
- question: △ (triangle)

#### Node Color (by session → cluster)
- Jede Session bekommt Farbe (auto-assigned)
- Validated → grüner Rand, Invalidated → roter Rand, Active → slate

#### Node Size
- Score/Centrality (connections)

#### Node Glow
- Confidence (0.3–1.0 opacity + blur)

#### Edge Style
- `related`: grau, solid
- `supports`: grün, solid
- `contradicts`: rot, solid
- `followup`: blau, solid
- `duplicate`: orange, dashed
- `section-of`: **fein graublau, gestrichelt** (parent→child)

#### Edge Thickness
- Weight (0–1) → 1–5px

### Interaktionen
- **Hover**: Tooltip (Title, Summary, Meta, Quick Actions)
- **Click**: Öffnet Sidebars (Details links, Relations rechts)
- **Double-Click**: Preview Modal
- **Shift+Click**: Pin Sidebars
- **Esc**: Unpin
- **Controls**: Pan (Drag), Zoom (Wheel), Search Mask (semantic), Session Filter, Similarity Threshold Slider

### Backend-Integration
- `GET /graph?session_id={id}` → nur Session-Knoten
- `GET /session/{id}/graph` → Session-Graph mit parent-child edges
- Edges: `type="section-of"` für Parent→Child

---

## 6. **ADMIN** (Duplicate Warnings + Reindex)

### Layout
```
┌──────────────────────────────────────────────────────┐
│ ╔════════ Duplicate Warnings (new) ═══════════╗   │
│ ║ GET /warnings/duplicates?threshold=0.92      ║   │
│ ║ ┌─────────────────────────────────────────┐ ║   │
│ ║ │ ⚠️ "Tesla Q4 Analysis" ↔ "Tesla Q4"     │ ║   │
│ ║ │    Similarity: 0.94                      │ ║   │
│ ║ │    [Link as Duplicate] [Soft Delete]     │ ║   │
│ ║ └─────────────────────────────────────────┘ ║   │
│ ║ ┌─────────────────────────────────────────┐ ║   │
│ ║ │ ⚠️ "Revenue Growth" ↔ "Revenue Increase" │ ║   │
│ ║ │    Similarity: 0.93                      │ ║   │
│ ║ │    [Actions...]                          │ ║   │
│ ║ └─────────────────────────────────────────┘ ║   │
│ ╚═══════════════════════════════════════════════╝   │
│ ╔════════ Reindex ══════════════════════════╗     │
│ ║ [Dry-Run] → Would reindex: 42             ║     │
│ ║ [Full Reindex] (with progress bar)        ║     │
│ ╚═══════════════════════════════════════════════╝     │
│ ╔════════ Trash ════════════════════════════╗     │
│ ║ (existing)                                 ║     │
│ ╚═══════════════════════════════════════════════╝     │
└──────────────────────────────────────────────────────┘
```

### Key Features
- **Warnings Panel**: GET `/warnings/duplicates` → Liste mit Score + Actions
- **Actions**: "Link as Duplicate" (POST `/thought/{id}/related`), "Soft Delete"

---

## 7. **SESSIONS** (Neue Tab – optional)

### Layout
```
┌──────────────────────────────────────────────────────┐
│ Manifold · Sessions                                  │
├──────────────────────────────────────────────────────┤
│ [New Session]  [Search _______]                     │
├──────────────────────────────────────────────────────┤
│ ╔════ session-alpha ════════════════════════════╗  │
│ ║ 8 thoughts │ Types: 3x obs, 5x ana             ║  │
│ ║ Last updated: 2025-10-28 14:23                 ║  │
│ ║ Summary: "Q4 Tesla performance analysis..."    ║  │
│ ║ [Open Search] [Open Graph] [Open Timeline]     ║  │
│ ╚══════════════════════════════════════════════════╝  │
│ ╔════ session-beta ═════════════════════════════╗  │
│ ║ 5 thoughts │ Types: 2x hyp, 3x dec             ║  │
│ ║ [Edit Summary] [Actions...]                    ║  │
│ ╚══════════════════════════════════════════════════╝  │
└──────────────────────────────────────────────────────┘
```

### Key Features
- GET `/sessions` → Cards
- Click "Open Search/Graph/Timeline" → Filter by `session_id`
- "Edit Summary" → POST `/session/{id}/summary`

---

### API CLIENT UPDATE (`manifold.ts`)

Neue Funktionen hinzufügen:
```typescript
// Sessions
export const getSessions = (limit = 100) => http<any>(`/v1/memory/sessions?limit=${limit}`);
export const getSessionThoughts = (sid: string, include_content = true) => http<any>(`/v1/memory/session/${sid}/thoughts?include_content=${include_content}`);
export const getSessionGraph = (sid: string) => http<any>(`/v1/memory/session/${sid}/graph`);
export const getSessionSummary = (sid: string) => http<any>(`/v1/memory/session/${sid}/summary`);
export const upsertSessionSummary = (sid: string, body: { title?: string; summary: string; content?: string }) => http<any>(`/v1/memory/session/${sid}/summary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Children & Tree
export const getChildren = (id: string) => http<any>(`/v1/memory/thought/${id}/children`);
export const getTree = (id: string, depth = 3) => http<any>(`/v1/memory/thought/${id}/tree?depth=${depth}`);

// Duplicate Warnings
export const checkDuplicate = (body: { title?: string; summary?: string; content?: string; threshold?: number }) => http<any>(`/v1/memory/check-duplicate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const getDuplicateWarnings = (threshold = 0.92, limit = 50, session_id?: string) => {
  const q = new URLSearchParams({ threshold: String(threshold), limit: String(limit) });
  if (session_id) q.set('session_id', session_id);
  return http<any>(`/v1/memory/warnings/duplicates?${q.toString()}`);
};

// Enhanced Search (v2)
export const searchV2 = (body: { query?: string; vector_type?: 'summary' | 'text' | 'title'; include_content?: boolean; filters?: any; limit?: number }) => 
  http<any>(`/v1/memory/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
```

---

### KOMPONENTEN-STRUKTUR (neue + updates)

```
/lib/components/manifold/
├── KpiCard.svelte (update: glassmorphic)
├── ManifoldNav.svelte (update: add Sessions tab)
├── ThoughtCard.svelte (update: children indicator, version badge)
├── TypeBadge.svelte (existing)
├── StatusBadge.svelte (existing)
├── ThoughtPreviewModal.svelte (existing)
├── SearchControls.svelte (NEW: vector_type + cheap mode + session filter)
├── SessionCard.svelte (NEW: for Sessions tab/dashboard)
├── TreeView.svelte (NEW: hierarchical parent-child tree)
├── VersionDiff.svelte (NEW: version snapshots diff)
├── DuplicateWarningCard.svelte (NEW: for Admin)
└── GlassPanel.svelte (NEW: reusable glassmorphic container)
```

---

### IMPLEMENTATION REIHENFOLGE

1. **API Client Update** (`manifold.ts`): Neue Endpoints hinzufügen
2. **Design Tokens** (`tailwind.config`): Coalescence-Farben, Blur-Utilities
3. **Basis-Komponenten**: `GlassPanel.svelte`, `SearchControls.svelte`
4. **Dashboard**: Sessions-Panel, Duplicate Warnings KPI
5. **Search**: vector_type + cheap mode Controls
6. **Thoughts**: Tree Tab, Versions Tab
7. **Graph**: Session-Filter, section-of edges, semantische Shapes
8. **Admin**: Duplicate Warnings Panel
9. **Sessions Tab** (optional): Neue Route
10. **Polish**: Transitions, Icons, Hover-States, Loading-States

---

### DESIGN-TOKENS (Tailwind Config)

```javascript
// tailwind.config.cjs
module.exports = {
  theme: {
    extend: {
      colors: {
        coalescence: {
          glass: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
          shadow: 'rgba(0, 0, 0, 0.3)',
        },
      },
      backdropBlur: {
        'glass': '12px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
    },
  },
};
```

---

### FINALE CHECKLISTE (Backend-Utilisierung 100%)

✅ Multi-Vector (text/title/summary) → Search Controls  
✅ 2-Phase Retrieval (include_content) → Cheap Mode  
✅ Sessions APIs → Dashboard + Sessions Tab + Filter überall  
✅ Children/Tree → Thoughts Detail Tree Tab  
✅ Versioning → Thoughts Detail Versions Tab  
✅ Duplicate Warnings → Dashboard KPI + Admin Panel  
✅ Graph session_id Filter → Graph Controls  
✅ section-of edges → Graph Visualization  
✅ Coalescence-Design → GlassPanel + Gradienten + Blur  

---

**Das ist die Vision. Sauber, konkret, 100% Backend-Utilisierung, modernes Coalescence-Design, keine Features verschwendet.**

Soll ich jetzt einen Plan erstellen und mit der Implementierung starten?
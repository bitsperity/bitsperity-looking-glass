## Manifold Frontend – Bestandsaufnahme und Abbildungsplan (MF_FE)

Dieser Leitfaden dokumentiert den aktuellen Stand des Manifold-Backends sowie die vorhandene Looking-Glass-Frontend-Struktur und definiert ein nutzerfreundliches UI/UX‑Konzept, das 100% der Manifold‑Endpoints abbildet.

### 1) Systemübersicht (heute)
- **Service**: `manifold-api` (FastAPI, Port 8083, Hot‑Reload aktiv)
- **Vector DB**: Qdrant (Collection: `manifold_thoughts`, Named Vectors: `text`, `title`, Dimension: 1024)
- **Embeddings**: `sentence-transformers` lokal; Default: `mixedbread-ai/mxbai-embed-large-v1`
- **GPU**: via Docker `deploy.resources.reservations.devices`; Umschaltbar per `MANIFOLD_EMBED_DEVICE` (`cuda`/`cpu`/auto)
- **Hot-Reload**: Uvicorn `--reload`, RW‑Mounts für `./apps`, `./libs`
- **Auth**: aktuell nicht vorhanden (lokale Entwicklung)

Wichtige Env Vars:
- `QDRANT_URL` (Default `http://localhost:6333`)
- `MANIFOLD_QDRANT_COLLECTION` (Default `manifold_thoughts`)
- `MANIFOLD_EMBED_PROVIDER` (Default `local`)
- `MANIFOLD_EMBED_MODEL` (Default `mixedbread-ai/mxbai-embed-large-v1`)
- `MANIFOLD_EMBED_DEVICE` (`cuda`, `cpu`, oder leer für Auto)

### 2) Datenmodell – ThoughtEnvelope (vereinheitlichte Struktur)
- **Kernfelder**: `id`, `type` (`observation` | `hypothesis` | `analysis` | `decision` | `reflection` | `question`), `status`, `confidence_level`, `confidence_score`, `title`, `content`, `summary`
- **Taxonomie**: `tags`, `tickers`, `sectors`, `timeframe`
- **Metadaten**: `created_at`, `updated_at`, `version`, `updated_by`, `change_reason`
- **Verknüpfungen**: `links` (u.a. `ariadne_entities`, `ariadne_facts`, `related_thoughts`)
- **Epistemologie**: `epistemology` (Reasoning, Annahmen, Evidenz)
- **Retrieval-Hinweise**: `retrieval` (Embedding‑Modell‑Hinweis, Keywords)
- **Flags**: `promoted_to_kg`, `pinned`, `quarantined`
- **Typ‑spezifisch**: `type_payload` (z.B. Hypothesis/Decision)

### 3) API-Fläche – Endpoints (heute)
Basispräfix: `/v1/memory`

1) Health
- `GET /health` → Status, Qdrant‑Connectivity, Collection, Embedding‑Model
- `GET /config` → Collection‑Name, Vektor‑Dimension, Provider
- `GET /device` → GPU/CPU‑Status (CUDA, Name, Speicher, Versionen, `model_device`)

2) Thoughts (CRUD)
- `POST /thought` → Thought anlegen (Embeddings werden erzeugt)
- `GET /thought/{id}` → Thought laden (Payload)
- `PATCH /thought/{id}` → Teilaktualisierung (Re‑Embedding bei Titel/Content)
- `DELETE /thought/{id}?soft=true` → Soft‑Delete (Status `deleted`) oder Hard‑Delete

3) Search & Analytics
- `POST /search` → Semantische Suche + Filter + Facets, Re‑Ranking, optional Diversität (MMR)
- `GET /timeline?from_dt&to_dt&type&tickers` → Timeline & Bucketed by Day
- `GET /stats?tickers&timeframe` → Aggregationen: `total`, `by_type`, `by_status`, `avg_confidence`, `validation_rate`

4) Relations
- `POST /thought/{id}/related` Body `{related_id}` → Link erstellen
- `DELETE /thought/{id}/related/{related_id}` → Link entfernen
- `GET /thought/{id}/related` → Incoming/Outgoing + verbundene Thoughts

5) Promote & Sync (Ariadne)
- `POST /thought/{id}/promote` → `kg_payload` für Ariadne, optional `auto_mark`
- `POST /sync/ariadne` → Flags/Links aktualisieren (`promoted_to_kg`, `ariadne_facts`, `ariadne_entities`)

6) Admin & Advanced
- `GET /thought/{id}/history` → Versionsliste (MVP: nur aktuelle Version)
- `POST /thought/{id}/reembed` → Vektorneuberechnung (`text`/`title`)
- `POST /reindex` → Dry‑Run oder vollständiges Re‑Embedding aller Treffer
- `POST /dedupe` → Stub für semantische Deduplikation (Rückgabe: leer, `scanned`)
- `POST /thought/{id}/quarantine` / `POST /thought/{id}/unquarantine` → Status/Flags setzen
- `GET /trash` → Soft‑deleted Thoughts
- `POST /trash/{id}/restore` → Restore
- `GET /similar/{id}?k=10` → KNN via Vektorähnlichkeit
- Nicht implementiert: `POST /thought/{id}/rollback`, `POST /merge`, `POST /explain/search` (HTTP 501)

Schema/Index in Qdrant:
- Named Vectors: `text`, `title` (COSINE, size=1024)
- Payload‑Indizes: `type` (KEYWORD), `status` (KEYWORD), `tickers` (KEYWORD), `created_at` (DATETIME)

### 4) Looking‑Glass Frontend – Ist‑Zustand
- Vorhanden: `apps/looking_glass/src` (SvelteKit)
- Navigation/Layouts:
  - `routes/+layout.svelte` lädt `Sidebar`/`Topbar`
  - `routes/+layout.ts` setzt `section: 'satbase'` und `apiBase`
  - `lib/components/layout/Sidebar.svelte` enthält Links: `Satbase`, `Tesseract`
  - Root `+page.svelte` redirectet auf `/satbase`
- API‑Clients vorhanden für: `satbase`, `tesseract`, aber **kein** `manifold` Client

Implikation: Wir erweitern Looking Glass, fügen einen Sidebar‑Eintrag „Manifold“ hinzu, neue Routen, und bauen einen `manifold.ts` API‑Client analog zu `tesseract.ts`.

### 5) UX‑Abbildung – Seiten & Komponenten (Vorschlag)
Navigationspunkt: „Manifold“ (Sidebar)

- **Dashboard**
  - Kacheln: Health (`/health`), Device (`/device`), Stats (`/stats`), Collection‑Infos (`/config`)
  - Quick‑Actions: „Neuer Thought“, „Re‑embed alle (Dry‑Run)“, „Dedupe (Dry‑Run)“

- **Search**
  - Query‑Bar mit semantischer Suche (Debounce), Ergebnisliste, Facetten (Tickers, Type, Status, Timeframe)
  - Advanced: MMR‑Slider, Boost‑Controls (Type/Tickers), gespeicherte Suchen

- **Timeline**
  - Zeitfilter (From/To), Filter (Type, Tickers), Bucketed‑Ansicht, Infinite Scroll

- **Thoughts**
  - Create/Edit‑Form (Schema‑geleitet aus ThoughtEnvelope), Inline‑Validation, Autosave
  - Detailseite: Tabs für Content, Epistemology, Links, History, Vector‑Info

- **Relations**
  - Graphische Relation‑Ansicht (incoming/outgoing), Relation‑Editor (add/remove links)
  - „Similar“‑Panel (KNN) mit „Relate“‑Shortcut

- **Promote**
  - Promote‑Flow (KG‑Payload anzeigen/bearbeiten), `auto_mark`‑Option
  - Sync‑Bereich: `ariadne_facts` / `ariadne_entities` einsehen

- **Admin**
  - Quarantine/Unquarantine, Trash/Restore, Reindex (Dry‑Run), Dedupe (Stub)
  - Device/Runtime‑Panel aus `/device` (GPU Memory, CUDA, Model Device)

UX/Tech Empfehlungen:
- Request‑Layer mit AbortController/Debounce, Query‑Keys, SWR/React Query oder Svelte‑Query
- Optimistic Updates für CRUD/Relations, Undo (Soft‑Delete → Restore)
- Virtuelle Listen (Search/Timeline), Skeletons/Toasts, per‑Page URL‑State
- Keyboard Shortcuts (/, Enter, e, r, q), Command‑Palette; A11y, Dark Mode

### 6) Endpoint‑zu‑UI Mapping (konkret)
- Dashboard: `GET /health`, `GET /config`, `GET /device`, `GET /stats`
- Search: `POST /search` (+ Facets), Schnellzugriff `GET /similar/{id}`
- Timeline: `GET /timeline`
- Thoughts: `POST/GET/PATCH/DELETE /thought{...}`
- Relations: `GET/POST/DELETE /thought/{id}/related{...}`
- Promote: `POST /thought/{id}/promote`, `POST /sync/ariadne`
- Admin: `POST /reindex`, `POST /dedupe`, `GET /trash`, `POST /trash/{id}/restore`, `POST /thought/{id}/reembed`, `POST /thought/{id}/quarantine`, `POST /thought/{id}/unquarantine`, `GET /thought/{id}/history`

### 7) API‑Verhalten – wichtige Details für die UI
- Create/Patch berechnen Embeddings (Re‑Embed bei Content/Titel‑Änderungen)
- Delete: Soft‑Delete per Default (`status = deleted`), Hard‑Delete per `soft=false`
- Similar: basiert auf `text`‑Vektor (KNN, k=10 Default)
- Reindex: `dry_run` Default = `true` (UI als „Vorschau“ anzeigen)
- Dedupe: Stub – UI als „Check bereit, Logik folgt“ kennzeichnen
- Device: immer sichtbar für GPU/CPU‑Diagnostik

### 8) Implementierungsfahrplan Frontend (High‑Level)
1. `lib/api/manifold.ts` erstellen (Basis‑URL `VITE_MANIFOLD_BASE`, Default `http://127.0.0.1:8083`)
2. Sidebar‑Eintrag „Manifold“ + neue Routen: `/manifold/{dashboard,search,timeline,thoughts,relations,promote,admin}`
3. Dashboard mit Health/Device/Stats‑Kacheln
4. Search mit Facetten + Ergebnisliste + Detail‑Drawer
5. Thought‑Create/Edit + Detailseite
6. Relations‑Ansicht + Editor + Similar‑Panel
7. Promote‑Flow + Sync‑Ansicht
8. Admin‑Panel (Quarantine/Trash/Reindex/Dedupe)
9. Polishing: Shortcuts, Saved Views, MMR/Boosts, Error‑States

### 9) Offene Punkte / spätere Erweiterungen
- AuthN/Z (API‑Schlüssel/Rollen, Audit‑Trail vollwertig)
- Vollständige Versionierung, Rollback, Merge
- Deduplication‑Algorithmik (Vektorgraph‑Clustering, Near‑Duplicate Detection)
- Explain‑Search (Feature‑Werte, Gewichtungen, Debug‑Ansicht)
- Bulk‑Operations, Export/Import
- Realtime‑Updates (SSE/WebSocket)

—
Stand: Systeme analysiert, Frontend‑Mapping vollständig definiert. Umsetzung kann unmittelbar starten.

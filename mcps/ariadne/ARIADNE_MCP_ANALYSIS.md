# Ariadne MCP Coverage Analysis

## Zusammenfassung

**Status:** ✅ Großteil der Backend-APIs ist bereits wrapped  
**Gefährliche Endpoints:** Teilweise exposed (z.B. reset, delete)  
**Fehlende Endpoints:** ~5 wichtige Read-Endpoints + Learn-Endpoints  
**Empfehlung:** Reset/Delete-Funktionen mit Warnungen versehen oder entfernen

---

## 1. Backend-Endpoints Übersicht

### Health & Stats
| Endpoint | Method | Status | MCP Tool |
|----------|--------|--------|----------|
| `/health` | GET | ✅ | `ar-health` |
| `/v1/kg/stats` | GET | ✅ | `ar-stats` |
| `/v1/kg/admin/stats` | GET | ✅ | `ar-admin-stats` |
| `/v1/kg/admin/stats/detailed` | GET | ✅ | `ar-admin-stats-detailed` |

### Read Endpoints (`/v1/kg/*`)
| Endpoint | Method | Status | MCP Tool | Notizen |
|----------|--------|--------|----------|---------|
| `/context` | GET | ✅ | `ar-context` | |
| `/impact` | GET | ✅ | `ar-impact` | |
| `/timeline` | GET | ✅ | `ar-timeline` | |
| `/similar-entities` | GET | ✅ | `ar-similar-entities` | |
| `/patterns` | GET | ✅ | `ar-patterns-search` | |
| `/patterns/{id}/occurrences` | GET | ✅ | `ar-pattern-occurrences` | |
| `/regimes/current` | GET | ✅ | `ar-regimes-current` | |
| `/regimes/similar` | GET | ✅ | `ar-regimes-similar` | |
| `/search` | GET | ❌ | **FEHLT** | Fulltext-Suche über Nodes |
| `/path` | GET | ❌ | **FEHLT** | Pfad zwischen 2 Nodes |
| `/time-slice` | GET | ❌ | **FEHLT** | Graph-Snapshot zu Zeitpunkt |

### Write Endpoints (`/v1/kg/*`)
| Endpoint | Method | Status | MCP Tool | Notizen |
|----------|--------|--------|----------|---------|
| `/fact` | POST | ✅ | `ar-add-fact` | |
| `/observation` | POST | ✅ | `ar-add-observation` | |
| `/hypothesis` | POST | ✅ | `ar-add-hypothesis` | |

### Validate Endpoints (`/v1/kg/validate/*`)
| Endpoint | Method | Status | MCP Tool | Notizen |
|----------|--------|--------|----------|---------|
| `/hypothesis/{id}/evidence` | POST | ✅ | `ar-add-evidence` | |
| `/hypothesis/{id}/validate` | POST | ✅ | `ar-validate-hypothesis` | |
| `/hypotheses/pending-validation` | GET | ✅ | `ar-pending-validations` | |
| `/hypotheses/{id}` | GET | ✅ | `ar-get-hypothesis` | |

### Analytics Endpoints (`/v1/kg/analytics/*`)
| Endpoint | Method | Status | MCP Tool | Notizen |
|----------|--------|--------|----------|---------|
| `/centrality` | GET | ✅ | `ar-analytics-centrality` | |
| `/communities` | GET | ✅ | `ar-analytics-communities` | |
| `/similarity` | GET | ✅ | `ar-analytics-similarity` | |
| `/link-prediction` | GET | ✅ | `ar-analytics-link-prediction` | |
| `/confidence/propagate` | GET | ✅ | `ar-analytics-confidence-propagate` | |

### Decision Endpoints (`/v1/kg/decision/*`)
| Endpoint | Method | Status | MCP Tool | Notizen |
|----------|--------|--------|----------|---------|
| `/risk` | GET | ✅ | `ar-decision-risk` | |
| `/lineage` | GET | ✅ | `ar-decision-lineage` | |
| `/impact` | GET | ✅ | `ar-decision-impact` | |
| `/opportunities` | GET | ✅ | `ar-decision-opportunities` | |

### Quality Endpoints (`/v1/kg/quality/*`)
| Endpoint | Method | Status | MCP Tool | Notizen |
|----------|--------|--------|----------|---------|
| `/contradictions` | GET | ✅ | `ar-quality-contradictions` | |
| `/gaps` | GET | ✅ | `ar-quality-gaps` | |
| `/anomalies` | GET | ✅ | `ar-quality-anomalies` | |
| `/duplicates` | GET | ✅ | `ar-quality-duplicates` | |

### Admin Endpoints (`/v1/kg/admin/*`)
| Endpoint | Method | Status | MCP Tool | Gefährlich? | Notizen |
|----------|--------|--------|----------|-------------|---------|
| `/reset` | POST | ✅ | `ar-admin-reset` | ⚠️ **JA** | Löscht ALLES |
| `/stats` | GET | ✅ | `ar-admin-stats` | ❌ | |
| `/stats/detailed` | GET | ✅ | `ar-admin-stats-detailed` | ❌ | |
| `/node` | PATCH | ✅ | `ar-admin-update-node` | ⚠️ Moderate | Property-Updates |
| `/edge` | PATCH | ✅ | `ar-admin-update-edge` | ⚠️ Moderate | Property-Updates |
| `/node/{id}` | DELETE | ✅ | `ar-admin-delete-node` | ⚠️ **JA** | Kann force=true |
| `/edge` | DELETE | ✅ | `ar-admin-delete-edge` | ⚠️ **JA** | Löscht Relationen |
| `/hypothesis/{id}/retract` | POST | ✅ | `ar-admin-retract-hypothesis` | ⚠️ Moderate | Soft-Delete |
| `/pattern/{id}` | DELETE | ✅ | `ar-admin-delete-pattern` | ⚠️ **JA** | Löscht Pattern |
| `/cleanup/orphaned-nodes` | POST | ✅ | `ar-admin-cleanup-orphaned-nodes` | ⚠️ Moderate | Mit dry_run |
| `/snapshot-degrees` | POST | ✅ | `ar-admin-snapshot-degrees` | ❌ | Read-only Update |
| `/deduplicate/plan` | GET | ✅ | `ar-dedup-plan` | ❌ | Read-only |
| `/deduplicate/execute` | POST | ✅ | `ar-dedup-execute` | ⚠️ Moderate | Mit dry_run |
| `/learning/apply-feedback` | POST | ✅ | `ar-learning-apply-feedback` | ⚠️ Moderate | Mit dry_run |
| `/learning/history` | GET | ✅ | `ar-learning-history` | ❌ | Read-only |

### Learn Endpoints (`/v1/kg/learn/*`)
| Endpoint | Method | Status | MCP Tool | Notizen |
|----------|--------|--------|----------|---------|
| `/correlation` | POST | ❌ | **FEHLT** | Background-Task für Korrelationen |
| `/community` | POST | ❌ | **FEHLT** | Background-Task für Community-Detection |

### Ingest Endpoints
| Endpoint | Method | Status | MCP Tool | Notizen |
|----------|--------|--------|----------|---------|
| `/v1/kg/ingest/prices` | POST | ✅ | `ar-ingest-prices` | Background-Task |

### Suggestions Endpoints (`/v1/kg/suggestions/*`)
| Endpoint | Method | Status | MCP Tool | Notizen |
|----------|--------|--------|----------|---------|
| `/tickers` | GET | ✅ | `ar-suggest-tickers` | |
| `/topics` | GET | ✅ | `ar-suggest-topics` | |
| `/event-types` | GET | ✅ | `ar-suggest-event-types` | |
| `/sectors` | GET | ✅ | `ar-suggest-sectors` | |
| `/relation-types` | GET | ✅ | `ar-suggest-relation-types` | |
| `/event-names` | GET | ✅ | `ar-suggest-event-names` | |
| `/company-names` | GET | ✅ | `ar-suggest-company-names` | |
| `/pattern-categories` | GET | ✅ | `ar-suggest-pattern-categories` | |
| `/regime-names` | GET | ✅ | `ar-suggest-regime-names` | |

---

## 2. Fehlende Endpoints (Kritisch für Agent)

### 🔴 Hoch-Priorität (sollten gewrapped werden)

#### `/v1/kg/search` (GET)
- **Was:** Fulltext-Suche über alle Nodes via Fulltext-Index
- **Warum wichtig:** Agent braucht freie Suche nach Entities
- **Parameter:** `text`, `labels?`, `limit?`
- **Use Case:** "Finde alle Nodes die 'Tesla' oder 'EV' enthalten"

#### `/v1/kg/path` (GET)
- **Was:** Finde Pfade zwischen zwei Nodes (APOC path expansion)
- **Warum wichtig:** Agent will Verbindungen zwischen Entities verstehen
- **Parameter:** `from_id`, `to_id`, `max_hops?`, `algo?` (shortest/ksp)
- **Use Case:** "Wie ist TSLA mit AAPL verbunden?"

#### `/v1/kg/time-slice` (GET)
- **Was:** Graph-Snapshot zu bestimmtem Zeitpunkt (via valid_from/valid_to)
- **Warum wichtig:** Historische Analyse - "Wie sah der Graph am 2024-01-01 aus?"
- **Parameter:** `as_of`, `topic?`, `tickers?`, `limit?`
- **Use Case:** "Zeige mir den Graph-Zustand vor dem Event X"

### 🟡 Mittel-Priorität (Background-Tasks)

#### `/v1/kg/learn/correlation` (POST)
- **Was:** Berechnet Preis-Korrelationen zwischen Symbolen
- **Warum wichtig:** Für Pattern-Detection und Zusammenhänge
- **Parameter:** `symbols[]`, `window?`, `from_date?`, `to_date?`, `method?`
- **Note:** Läuft als Background-Task, daher weniger kritisch

#### `/v1/kg/learn/community` (POST)
- **Was:** Louvain Community Detection
- **Warum wichtig:** Gruppierung von verwandten Companies
- **Parameter:** Keine (triggert Background-Task)
- **Note:** Läuft als Background-Task, daher weniger kritisch

---

## 3. Gefährliche Endpoints (Bewertung)

### ⚠️ KRITISCH - Entfernen aus MCP

#### `ar-admin-reset` (`POST /v1/kg/admin/reset`)
- **Gefahr:** Löscht **ALLES** im Knowledge Graph
- **Entscheidung:** ❌ **ENTFERNEN aus MCP** - Zu gefährlich für Agent
- **Begründung:** Agent sollte keinen kompletten Reset durchführen können
- **Alternative:** Reset nur manuell über API/Direct Access möglich

### ✅ WICHTIG - Behalten für Graph-Pflege

#### `ar-admin-delete-node` (`DELETE /v1/kg/admin/node/{id}`)
- **Funktion:** Löscht falsche/duplizierte Nodes
- **Bedeutung:** ✅ **WICHTIG** - Agent muss Graph-Pflege durchführen können
- **Aktueller Schutz:** Standard: Fail wenn Connections existieren, force=true erforderlich
- **Empfehlung:** 
  - ✅ Behalten mit Warnung: "⚠️ Use with caution - may break graph integrity if force=true"
  - ✅ `force` sollte explizit übergeben werden müssen (nicht default)

#### `ar-admin-delete-edge` (`DELETE /v1/kg/admin/edge`)
- **Funktion:** Löscht falsche Relationen
- **Bedeutung:** ✅ **WICHTIG** - Agent muss falsche Daten korrigieren können
- **Empfehlung:** 
  - ✅ Behalten mit Warnung: "⚠️ Use with caution - removes relations permanently"
  - ✅ Teil der Graph-Pflege-Workflows

#### `ar-admin-delete-pattern` (`DELETE /v1/kg/admin/pattern/{id}`)
- **Gefahr:** Löscht validierte Patterns
- **Aktueller Schutz:** `reasoning` Parameter erforderlich
- **Empfehlung:** 
  - ✅ Behalten - Patterns können falsch sein, Löschung ist sinnvoll
  - ✅ `reasoning` ist bereits erforderlich (gut)

### 🟡 MODERAT - Mit Vorsicht verwenden

#### `ar-admin-update-node` / `ar-admin-update-edge`
- **Gefahr:** Kann Properties überschreiben, aber nicht destruktiv
- **Empfehlung:** ✅ Behalten - Korrekturen sind wichtig für Agent

#### `ar-admin-retract-hypothesis`
- **Gefahr:** Soft-Delete, nicht destruktiv
- **Empfehlung:** ✅ Behalten - Agent muss Hypothesen korrigieren können

#### `ar-dedup-execute`
- **Gefahr:** Merges Nodes, kann Daten verlieren
- **Aktueller Schutz:** `dry_run=true` by default
- **Empfehlung:** ✅ Behalten - Mit dry_run ist sicher

#### `ar-learning-apply-feedback`
- **Gefahr:** Ändert Confidence-Werte automatisch
- **Aktueller Schutz:** `dry_run=true` by default
- **Empfehlung:** ✅ Behalten - Mit dry_run ist sicher

---

## 4. Verfügbare Features über bestehende Endpoints

### ✅ Bereits möglich über bestehende Endpoints:

#### 1. **Subgraph Extraction**
- **Endpoint:** `/v1/kg/context` oder `/v1/kg/time-slice`
- **Use Case:** "Gib mir den Subgraph aller Tech-Companies und deren Lieferanten"
- **Status:** ✅ Bereits verfügbar

#### 2. **Temporal Queries**
- **Endpoint:** `/v1/kg/timeline`
- **Use Case:** "Zeige mir alle Events/Relationen für TSLA zwischen Q1 und Q2"
- **Status:** ✅ Bereits verfügbar

#### 3. **Path Finding**
- **Endpoint:** `/v1/kg/path`
- **Use Case:** "Wie ist TSLA mit AAPL verbunden?"
- **Status:** ✅ Bereits verfügbar (wird noch gewrapped)

### ❌ Nicht verfügbar (müssten wir implementieren - NICHT machen):

#### 1. **Batch-Operations**
- **Status:** ❌ Backend hat keine Batch-Endpoints
- **Komplexität:** Hoch - müssten wir implementieren
- **Entscheidung:** ❌ NICHT implementieren (experimentell)

#### 2. **Graph-Traversal mit Relationship-Filtern**
- **Status:** ❌ `/path` unterstützt keine `rel_types` Filter
- **Komplexität:** Mittel - müssten wir erweitern
- **Entscheidung:** ❌ NICHT implementieren (experimentell)

#### 3. **Confidence Aggregation**
- **Status:** ❌ Kein dedizierter Endpoint
- **Komplexität:** Mittel - könnte über Cypher gehen, aber kein Endpoint
- **Entscheidung:** ❌ NICHT implementieren (experimentell)

#### 4. **Pattern Matching**
- **Status:** ❌ Kein Endpoint für Pattern-Matching in Subgraph
- **Komplexität:** Hoch - komplexe Logik erforderlich
- **Entscheidung:** ❌ NICHT implementieren (experimentell)

#### 5. **Bulk Confidence Updates**
- **Status:** ❌ Kein Bulk-Update Endpoint
- **Komplexität:** Mittel - müssten wir implementieren
- **Entscheidung:** ❌ NICHT implementieren (experimentell)

#### 6. **Graph Export/Import**
- **Status:** ❌ Keine Export/Import-Endpoints
- **Komplexität:** Hoch - Format-Konvertierung erforderlich
- **Entscheidung:** ❌ NICHT implementieren (experimentell)

---

## 5. Zusammenfassung & Empfehlungen

### ✅ Was gut ist:
- **95% Coverage:** Fast alle wichtigen Endpoints sind wrapped
- **Sicherheit:** Gefährliche Endpoints haben zumindest `confirm` oder `dry_run` Parameter
- **Struktur:** Gut organisiert nach Funktionalität (read, write, admin, etc.)

### ⚠️ Was verbessert werden sollte:

#### 1. **Fehlende Read-Endpoints hinzufügen:**
- ✅ `/v1/kg/search` - **KRITISCH** (existiert bereits im Backend)
- ✅ `/v1/kg/path` - **KRITISCH** (existiert bereits im Backend)
- ✅ `/v1/kg/time-slice` - **WICHTIG** (existiert bereits im Backend)

#### 2. **Gefährliche Endpoints entfernen/absichern:**
- ❌ `ar-admin-reset`: **ENTFERNEN aus MCP** - Zu gefährlich für Agent
- ✅ `ar-admin-delete-node`: **BEHALTEN** - Wichtig für Graph-Pflege, Warnung hinzufügen
- ✅ `ar-admin-delete-edge`: **BEHALTEN** - Wichtig für Graph-Pflege, Warnung hinzufügen

#### 3. **Learn-Endpoints hinzufügen:**
- ✅ `/v1/kg/learn/correlation` - Background-Task (existiert bereits im Backend)
- ✅ `/v1/kg/learn/community` - Background-Task (existiert bereits im Backend)

#### 4. **NICHT implementieren (experimentell):**
- ❌ Batch-Operations - Backend hat keine Batch-Endpoints
- ❌ Graph-Traversal mit Filtern - `/path` unterstützt keine rel_types Filter
- ❌ Confidence Aggregation - Kein dedizierter Endpoint
- ❌ Pattern Matching - Kein Endpoint
- ❌ Bulk Confidence Updates - Kein Endpoint
- ❌ Graph Export/Import - Keine Endpoints

---

## 6. Action Items

### Priorität 1 (Muss gemacht werden):
1. ✅ **Fehlende Read-Endpoints wrappen:**
   - `ar-search` (`/v1/kg/search`) - Backend existiert ✅
   - `ar-path` (`/v1/kg/path`) - Backend existiert ✅
   - `ar-time-slice` (`/v1/kg/time-slice`) - Backend existiert ✅

2. ✅ **Gefährliche Endpoints entfernen/absichern:**
   - ❌ `ar-admin-reset`: **ENTFERNEN aus MCP** (zu gefährlich)
   - ✅ `ar-admin-delete-node`: Warnung hinzufügen "⚠️ Graph-Pflege: Use with caution - may break graph integrity if force=true"
   - ✅ `ar-admin-delete-edge`: Warnung hinzufügen "⚠️ Graph-Pflege: Use with caution - removes relations permanently"

### Priorität 2 (Sollte gemacht werden):
3. ✅ **Learn-Endpoints wrappen:**
   - `ar-learn-correlation` (`/v1/kg/learn/correlation`) - Backend existiert ✅
   - `ar-learn-community` (`/v1/kg/learn/community`) - Backend existiert ✅

### ❌ NICHT implementieren (experimentell):
4. ❌ **Keine neuen Backend-Endpoints:**
   - Batch-Operations ❌
   - Graph-Traversal mit Filtern ❌
   - Confidence Aggregation ❌
   - Pattern Matching ❌
   - Bulk Confidence Updates ❌
   - Graph Export/Import ❌
   
   **Begründung:** Alle diese Features existieren nicht im Backend und müssten implementiert werden. User will nichts Experimentelles.

---

## 7. Code-Änderungen erforderlich

### Neue Tools erstellen:
1. `mcps/ariadne/src/lib/tools/read.ts` - Erweitern um:
   - `searchTool` - ✅ Backend existiert
   - `pathTool` - ✅ Backend existiert
   - `timeSliceTool` - ✅ Backend existiert

2. `mcps/ariadne/src/lib/tools/learn.ts` - NEU erstellen:
   - `correlationTool` - ✅ Backend existiert
   - `communityTool` - ✅ Backend existiert

3. `mcps/ariadne/src/lib/tools/admin.ts` - Änderungen:
   - ❌ `adminResetTool` - **ENTFERNEN** (zu gefährlich für Agent)
   - ✅ `adminDeleteNodeTool` - Warnung hinzufügen
   - ✅ `adminDeleteEdgeTool` - Warnung hinzufügen

### Schemas erweitern:
4. `mcps/ariadne/src/lib/schemas.ts` - Neue Schemas für:
   - `SearchRequestSchema`
   - `PathRequestSchema`
   - `TimeSliceRequestSchema`
   - `CorrelationRequestSchema`
   - `CommunityRequestSchema`

### Exports aktualisieren:
5. `mcps/ariadne/src/lib/tools/index.ts` - Neue Tools exportieren

---

**Erstellt:** 2025-01-XX  
**Status:** ✅ Analyse abgeschlossen, Ready für Implementation


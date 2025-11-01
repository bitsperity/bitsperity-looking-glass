# Ariadne MCP - Quick Reference

## Tool-Übersicht nach Kategorie

### 🔍 Read Tools (12)

| Tool | Zweck | Key Parameter |
|------|-------|---------------|
| `ar-context` | Subgraph für Topic/Ticker | `topic`, `tickers`, `depth`, `as_of` |
| `ar-impact` | Impact-Ranking für Event | `event_id`, `event_query`, `k` |
| `ar-timeline` | Chronologische Timeline | `ticker`, `entity_id`, `from_date`, `to_date` |
| `ar-similar-entities` | Ähnliche Companies | `ticker`, `method`, `limit` |
| `ar-patterns-search` | Suche Patterns | `category`, `min_confidence`, `min_occurrences` |
| `ar-pattern-occurrences` | Historische Pattern-Vorkommen | `pattern_id`, `from_date`, `to_date` |
| `ar-regimes-current` | Aktuelle Markt-Regimes | - |
| `ar-regimes-similar` | Ähnliche historische Regimes | `characteristics`, `limit` |
| `ar-search` | Fulltext-Suche | `text`, `labels`, `limit` |
| `ar-path` | Pfad zwischen Nodes | `from_id`, `to_id`, `max_hops`, `algo` |
| `ar-time-slice` | Graph-Snapshot zu Zeitpunkt | `as_of`, `topic`, `tickers` |

---

### ✍️ Write Tools (3)

| Tool | Zweck | Key Parameter |
|------|-------|---------------|
| `ar-add-fact` | Fact-Relation hinzufügen | `source_id`, `target_id`, `rel_type`, `confidence` |
| `ar-add-observation` | Observation hinzufügen | `date`, `content`, `tags`, `related_tickers` |
| `ar-add-hypothesis` | Hypothesis hinzufügen | `source_id`, `target_id`, `hypothesis`, `confidence` |

**Confidence-Guidelines**:
- **0.9+**: Verifizierte Fakten (Financial Reports)
- **0.7-0.9**: Hohe Wahrscheinlichkeit (News)
- **0.5-0.7**: Moderate (LLM-Extraktion) → Use Hypothesis
- **<0.5**: Spekulativ → Use Hypothesis

---

### ✅ Validate Tools (4)

| Tool | Zweck | Key Parameter |
|------|-------|---------------|
| `ar-add-evidence` | Evidence zu Hypothesis | `hypothesis_id`, `evidence_type`, `confidence` |
| `ar-validate-hypothesis` | Hypothesis validieren | `hypothesis_id`, `decision`, `create_pattern` |
| `ar-pending-validations` | Pending Hypotheses | `min_annotations` |
| `ar-get-hypothesis` | Hypothesis-Details | `hypothesis_id` |

**Workflow**: Hypothesis → Evidence (3+) → Validation → Pattern (optional)

---

### 📈 Analytics Tools (5)

| Tool | Zweck | Key Parameter |
|------|-------|---------------|
| `ar-analytics-centrality` | Centrality-Scores | `algo` (pagerank/betweenness/closeness), `label` |
| `ar-analytics-communities` | Community-Detection | `algo` (louvain/leiden), `label` |
| `ar-analytics-similarity` | Node-Similarity | `node_id`, `method`, `topk` |
| `ar-analytics-link-prediction` | Fehlende Links vorhersagen | `node_id`, `topk` |
| `ar-analytics-confidence-propagate` | Transitive Confidence | `from_id`, `to_label`, `max_depth` |

---

### 🎯 Decision Tools (4)

| Tool | Zweck | Key Parameter |
|------|-------|---------------|
| `ar-decision-risk` | Risiko-Score | `ticker`, `include_centrality` |
| `ar-decision-lineage` | Evidence-Lineage | `ticker`, `max_depth` |
| `ar-decision-impact` | Impact-Simulation | `ticker`, `node_id`, `max_depth`, `decay` |
| `ar-decision-opportunities` | Opportunity-Scoring | `label`, `w_gap`, `w_centrality`, `w_anomaly` |

---

### 🔍 Quality Tools (4)

| Tool | Zweck | Key Parameter |
|------|-------|---------------|
| `ar-quality-contradictions` | Widersprüche finden | - |
| `ar-quality-gaps` | Knowledge-Gaps finden | `label`, `min_relations`, `low_confidence_threshold` |
| `ar-quality-anomalies` | Anomalien finden | `label`, `z_threshold`, `growth_threshold` |
| `ar-quality-duplicates` | Duplikate finden | `label`, `similarity_threshold` |

---

### 🛠️ Admin Tools (9)

| Tool | Zweck | Key Parameter | ⚠️ Gefahr |
|------|-------|---------------|----------|
| `ar-admin-update-node` | Node-Properties updaten | `node_id`, `properties` | ✅ Safe |
| `ar-admin-update-edge` | Edge-Properties updaten | `source_id`, `target_id`, `rel_type`, `properties` | ✅ Safe |
| `ar-admin-delete-node` | Node löschen | `node_id`, `force` | ⚠️ Gefährlich |
| `ar-admin-delete-edge` | Edge löschen | `source_id`, `target_id`, `rel_type` | ⚠️ Gefährlich |
| `ar-admin-retract-hypothesis` | Hypothesis zurückziehen | `hypothesis_id`, `reasoning` | ✅ Safe |
| `ar-admin-delete-pattern` | Pattern löschen | `pattern_id`, `reasoning` | ⚠️ Moderate |
| `ar-admin-cleanup-orphaned-nodes` | Orphaned Nodes löschen | `dry_run`, `label` | ✅ Safe (dry_run) |
| `ar-admin-snapshot-degrees` | Degree-Snapshots | `label` | ✅ Safe |

---

### 🔄 Dedup Tools (2)

| Tool | Zweck | Key Parameter | ⚠️ Gefahr |
|------|-------|---------------|----------|
| `ar-dedup-plan` | Duplikat-Plan erstellen | `label`, `threshold` | ✅ Safe |
| `ar-dedup-execute` | Duplikate mergen | `source_id`, `target_id`, `strategy`, `dry_run` | ⚠️ Gefährlich |

**⚠️ WICHTIG**: Immer `dry_run=true` zuerst!

---

### 🎓 Learning Tools (2)

| Tool | Zweck | Key Parameter | ⚠️ Gefahr |
|------|-------|---------------|----------|
| `ar-learning-apply-feedback` | Confidence-Calibration | `dry_run`, `label` | ⚠️ Gefährlich |
| `ar-learning-history` | Learning-History | `relation_id`, `limit` | ✅ Safe |

**⚠️ WICHTIG**: Immer `dry_run=true` zuerst!

---

### 📚 Learn Tools (2) - Background Tasks

| Tool | Zweck | Key Parameter |
|------|-------|---------------|
| `ar-learn-correlation` | Preis-Korrelationen berechnen | `symbols`, `window`, `method` |
| `ar-learn-community` | Community-Detection | - |

**Hinweis**: Beide laufen als Background-Tasks asynchron.

---

### 📥 Ingest Tools (1)

| Tool | Zweck | Key Parameter |
|------|-------|---------------|
| `ar-ingest-prices` | Preis-Daten importieren | `symbols`, `from_date`, `to_date` |

**Hinweis**: Background-Task, läuft asynchron.

---

### 💡 Suggestions Tools (9)

| Tool | Zweck |
|------|-------|
| `ar-suggest-tickers` | Alle Ticker im Graph |
| `ar-suggest-topics` | Kombinierte Topics |
| `ar-suggest-event-types` | Event-Types |
| `ar-suggest-sectors` | Company-Sectors |
| `ar-suggest-relation-types` | Relation-Types |
| `ar-suggest-event-names` | Event-Namen |
| `ar-suggest-company-names` | Company-Namen |
| `ar-suggest-pattern-categories` | Pattern-Categories |
| `ar-suggest-regime-names` | Regime-Namen |

**Alle ohne Parameter** - geben Auto-Complete-Vorschläge zurück.

---

### 💚 Health & Stats (4)

| Tool | Zweck | Key Parameter |
|------|-------|---------------|
| `ar-health` | Health-Check | - |
| `ar-stats` | Grundlegende Statistiken | `detailed` |
| `ar-admin-stats` | Admin-Statistiken | - |
| `ar-admin-stats-detailed` | Detaillierte Statistiken | - |

---

## Quick Workflows

### 🔍 Company-Analyse
```
ar-search("Tesla") 
→ ar-context(tickers=["TSLA"], depth=2)
→ ar-timeline(ticker="TSLA")
→ ar-decision-risk(ticker="TSLA")
→ ar-similar-entities(ticker="TSLA")
```

### 📊 Event-Impact
```
ar-search("CHIPS Act", labels="Event")
→ ar-impact(event_id="...", k=20)
→ ar-decision-impact(node_id="...", max_depth=3)
→ ar-decision-lineage(ticker="...")
```

### ✅ Hypothesis-Validation
```
ar-add-hypothesis(...)
→ ar-add-evidence(hypothesis_id, supporting) [3x]
→ ar-pending-validations(min_annotations=3)
→ ar-get-hypothesis(hypothesis_id)
→ ar-validate-hypothesis(hypothesis_id, validate, create_pattern=true)
```

### 🛠️ Graph-Maintenance
```
ar-quality-contradictions()
→ ar-quality-duplicates()
→ ar-dedup-plan()
→ ar-dedup-execute(dry_run=true) [Review]
→ ar-dedup-execute(dry_run=false)
```

### 🎯 Opportunity-Discovery
```
ar-quality-gaps()
+ ar-quality-anomalies()
+ ar-analytics-centrality()
→ ar-decision-opportunities()
```

---

## Confidence-Level Guidelines

| Level | Confidence | Verwendung | Tool |
|-------|-----------|------------|------|
| **Verifiziert** | 0.9 - 1.0 | Financial Reports, Offizielle Daten | `ar-add-fact` |
| **Hoch** | 0.7 - 0.9 | News, Bekannte Zusammenhänge | `ar-add-fact` |
| **Moderat** | 0.5 - 0.7 | LLM-Extraktion, Spekulation | `ar-add-hypothesis` |
| **Niedrig** | 0.0 - 0.5 | Sehr spekulativ | `ar-add-hypothesis` |

---

## Sicherheitshinweise

### ⚠️ Gefährliche Operationen

| Tool | Gefahr | Schutz |
|------|--------|--------|
| `ar-admin-delete-node` | Kann Graph-Integrität brechen | `force=false` (default) |
| `ar-admin-delete-edge` | Entfernt Relationen permanent | Manuelle Bestätigung |
| `ar-dedup-execute` | Merges Nodes | `dry_run=true` zuerst! |
| `ar-learning-apply-feedback` | Ändert Confidences | `dry_run=true` zuerst! |

### ✅ Sichere Patterns

- ✅ Immer `dry_run=true` für Learning/Dedup
- ✅ `force=false` (default) für Delete-Operations
- ✅ Review-Phasen einbauen vor kritischen Operationen
- ✅ Verwende `ar-get-hypothesis` vor Validation

---

## Performance-Tipps

1. **Starte klein**: Niedrige `limit`-Werte (10-50)
2. **Erhöhe schrittweise**: `depth` von 1 → 2 → 3
3. **Filter verwenden**: `label`-Parameter für fokussierte Queries
4. **Background-Tasks**: `ar-learn-*` und `ar-ingest-*` laufen asynchron

---

## Temporal-Queries

| Use Case | Tool | Parameter |
|----------|------|-----------|
| Historischer Kontext | `ar-context` | `as_of` |
| Point-in-Time-Snapshot | `ar-time-slice` | `as_of` |
| Timeline-Analyse | `ar-timeline` | `from_date`, `to_date` |
| Zeitlich begrenzte Relation | `ar-add-fact` | `valid_from`, `valid_to` |

---

## Häufige Fehler vermeiden

1. ❌ **Zu hohe Limits**: Starte mit `limit=10-50`
2. ❌ **Zu tiefe Traversals**: `depth=3` kann langsam sein
3. ❌ **Fehlende dry_run**: Immer `dry_run=true` für Learning/Dedup
4. ❌ **Force-Deletion**: Verwende `force=false` (default)
5. ❌ **Zu niedrige Confidence**: <0.5 sollte Hypothesis sein, nicht Fact

---

**Version**: 1.0  
**Letzte Aktualisierung**: 2025-01-XX


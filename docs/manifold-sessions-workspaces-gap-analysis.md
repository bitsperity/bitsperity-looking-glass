# Manifold Sessions & Workspaces - Gap Analysis & Implementation Plan

## Aktueller Stand

### ✅ Was vorhanden ist:

**Backend APIs:**
- `GET /v1/memory/sessions` - Liste aller Sessions
- `GET /v1/memory/session/{id}/thoughts` - Thoughts einer Session
- `GET /v1/memory/session/{id}/graph` - Graph einer Session
- `GET /v1/memory/session/{id}/summary` - Summary einer Session
- `POST /v1/memory/session/{id}/summary` - Summary erstellen/updaten
- **Gleiche APIs für Workspaces**

**Frontend:**
- SessionCard Component (Dashboard)
- Filter für `session_id`/`workspace_id` in Search, Graph, Timeline
- Session-Select in Timeline
- CreateThoughtModal hat `session_id` Feld (hardcoded "default")

---

## ❌ Was komplett fehlt:

### 1. **Workspaces im Frontend**
- ❌ Keine WorkspaceCard Component
- ❌ Keine Workspace-API Funktionen in `manifold.ts`
- ❌ Keine Workspace-Übersichtsseite
- ❌ Keine Workspace-Detail-Seite
- ❌ Keine Workspace-Filter in UI (nur manuelles Input-Feld)

### 2. **Dedizierte Sessions-Seite**
- ❌ Keine `/manifold/sessions` Route
- ❌ Keine Session-Detail-Seite `/manifold/sessions/[id]`
- ❌ Keine Möglichkeit, Session-Summaries zu bearbeiten

### 3. **Thought Assignment UI**
- ❌ Keine Möglichkeit, bestehende Thoughts zu Sessions/Workspaces zuzuweisen
- ❌ CreateThoughtModal hat nur hardcoded `session_id: "default"`
- ❌ Keine Session/Workspace-Auswahl beim Erstellen
- ❌ Keine Bulk-Assignment-Funktion

### 4. **Session/Workspace Management**
- ❌ Keine Möglichkeit, Sessions/Workspaces zu erstellen
- ❌ Keine Möglichkeit, Sessions/Workspaces zu benennen/beschreiben
- ❌ Keine Möglichkeit, Sessions/Workspaces zu löschen/archivieren
- ❌ Keine Metadaten (created_at, description, etc.)

### 5. **Navigation & Discovery**
- ❌ Keine Breadcrumbs für Sessions/Workspaces
- ❌ Keine "zu Session/Workspace wechseln" Links in Thought-Details
- ❌ Keine Workspace-Übersicht im Dashboard
- ❌ Keine Suche nach Sessions/Workspaces

### 6. **Visualisierung**
- ❌ Keine Timeline-Ansicht für eine spezifische Session/Workspace
- ❌ Keine Graph-Ansicht für eine spezifische Session/Workspace (nur Filter im globalen Graph)
- ❌ Keine Comparison-View zwischen Sessions/Workspaces

---

## 🎯 Empfohlene Implementierung

### Phase 1: Foundation (Kritisch)

#### 1.1 Workspace API Funktionen hinzufügen
```typescript
// apps/looking_glass/src/lib/api/manifold.ts
export const getWorkspaces = (limit = 100) => 
  http<any>(`/v1/memory/workspaces?limit=${limit}`);

export const getWorkspaceThoughts = (wid: string, include_content = true) => 
  http<any>(`/v1/memory/workspace/${wid}/thoughts?include_content=${include_content}`);

export const getWorkspaceGraph = (wid: string) => 
  http<any>(`/v1/memory/workspace/${wid}/graph`);

export const getWorkspaceSummary = (wid: string) => 
  http<any>(`/v1/memory/workspace/${wid}/summary`);

export const upsertWorkspaceSummary = (wid: string, body: any) => 
  http<any>(`/v1/memory/workspace/${wid}/summary`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(body) 
  });
```

#### 1.2 WorkspaceCard Component
```svelte
<!-- apps/looking_glass/src/lib/components/manifold/WorkspaceCard.svelte -->
<!-- Ähnlich wie SessionCard, aber für Workspaces -->
```

#### 1.3 Sessions-Übersichtsseite
```svelte
<!-- apps/looking_glass/src/routes/manifold/sessions/+page.svelte -->
- Liste aller Sessions mit Cards
- Session-Suche/Filter
- Quick Actions: Graph, Search, Summary
```

#### 1.4 Workspaces-Übersichtsseite
```svelte
<!-- apps/looking_glass/src/routes/manifold/workspaces/+page.svelte -->
- Liste aller Workspaces mit Cards
- Workspace-Suche/Filter
- Quick Actions: Graph, Search, Summary
```

### Phase 2: Detail-Pages (Wichtig)

#### 2.1 Session-Detail-Seite
```svelte
<!-- apps/looking_glass/src/routes/manifold/sessions/[id]/+page.svelte -->
- Session-Info Header (ID, Count, Types)
- Tabs: Thoughts | Graph | Timeline | Summary
- Summary Editor (wenn vorhanden)
- Quick Actions: Assign Thoughts, Export
```

#### 2.2 Workspace-Detail-Seite
```svelte
<!-- apps/looking_glass/src/routes/manifold/workspaces/[id]/+page.svelte -->
- Workspace-Info Header (ID, Count, Types)
- Tabs: Thoughts | Graph | Timeline | Summary
- Summary Editor (wenn vorhanden)
- Quick Actions: Assign Thoughts, Export
```

### Phase 3: Thought Assignment (Wichtig)

#### 3.1 Session/Workspace Selector Component
```svelte
<!-- apps/looking_glass/src/lib/components/manifold/SessionWorkspaceSelector.svelte -->
- Dropdown für Sessions (mit Suche)
- Dropdown für Workspaces (mit Suche)
- "Create New" Option
- "None" Option (für unassigned)
```

#### 3.2 CreateThoughtModal erweitern
- Session/Workspace Selector integrieren
- Session/Workspace aus verfügbaren laden

#### 3.3 Thought-Detail-Seite erweitern
- Session/Workspace Assignment im Edit-Modus
- Breadcrumb-Links zu Session/Workspace

#### 3.4 Bulk Assignment
- Checkbox-Multi-Select für Thoughts
- "Assign to Session/Workspace" Bulk-Action

### Phase 4: Management Features (Nice-to-have)

#### 4.1 Session/Workspace Metadaten
- Backend: `created_at`, `description`, `metadata` Felder
- Frontend: Edit-Modal für Metadaten

#### 4.2 Navigation Improvements
- Breadcrumbs in Thought-Details
- "Switch to Session/Workspace" Links
- Quick-Switch Dropdown in Navbar

#### 4.3 Dashboard Integration
- Workspaces-Panel neben Sessions-Panel
- Recent Sessions/Workspaces
- Quick Access Cards

---

## 🚀 Quick Wins (Sofort umsetzbar)

1. **Workspace API Funktionen** (5 min)
2. **WorkspaceCard Component** (10 min - Copy von SessionCard)
3. **Workspaces-Seite** (15 min - Copy von Sessions-Logik)
4. **Session-Detail-Seite** (30 min)
5. **Workspace-Detail-Seite** (30 min - Copy von Session-Detail)

**Total: ~90 Minuten für Basis-Funktionalität**

---

## 💡 UX-Verbesserungen

### Problem: Aktuell sind Sessions/Workspaces "unsichtbar"
- **Lösung**: Dedizierte Übersichtsseiten mit Cards
- **Lösung**: Breadcrumbs zeigen Kontext
- **Lösung**: Quick-Actions für häufige Tasks

### Problem: Assignment ist umständlich
- **Lösung**: Dropdown-Selectors statt Text-Input
- **Lösung**: Bulk-Assignment für mehrere Thoughts
- **Lösung**: Auto-Suggest beim Erstellen

### Problem: Keine Übersicht über Struktur
- **Lösung**: Session/Workspace-Trees
- **Lösung**: Cross-Reference Links
- **Lösung**: Summary-Editor direkt in Detail-Page

---

## 🔧 Backend-Erweiterungen (Optional)

### Session/Workspace Metadaten
```python
# Neue Endpoints:
POST /v1/memory/session/{id}/metadata  # Set description, tags, etc.
POST /v1/memory/workspace/{id}/metadata

# Session/Workspace erstellen:
POST /v1/memory/sessions  # Create session with metadata
POST /v1/memory/workspaces  # Create workspace with metadata
```

### Bulk Assignment
```python
POST /v1/memory/thoughts/bulk-assign
{
  "thought_ids": ["id1", "id2"],
  "session_id": "session-123",  # optional
  "workspace_id": "workspace-456"  # optional
}
```

---

## 📋 Priorisierung

**Must-Have (für produktive Nutzung):**
1. ✅ Workspace API Funktionen
2. ✅ WorkspaceCard Component
3. ✅ Workspaces-Übersichtsseite
4. ✅ Session/Workspace-Detail-Seiten
5. ✅ Session/Workspace Selector in CreateThoughtModal

**Should-Have (für gute UX):**
6. ✅ Thought-Detail: Session/Workspace Assignment
7. ✅ Breadcrumbs & Navigation
8. ✅ Summary-Editor in Detail-Pages

**Nice-to-Have (für Power-User):**
9. Bulk Assignment
10. Session/Workspace Metadaten
11. Cross-References & Links


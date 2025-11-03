# Workspace > Session Hierarchie - Implementierungsplan

## Ziel
Sessions sollen IMMER innerhalb von Workspaces leben. Hierarchie: **Workspace > Session > Thought**

## Architektur-Änderungen

### Backend

#### 1. ThoughtEnvelope Schema
- `workspace_id`: **required** (nicht mehr optional)
- `session_id`: optional, aber wenn gesetzt, muss `workspace_id` auch gesetzt sein
- Validation: Wenn `session_id` gesetzt, dann muss der Thought zum gleichen Workspace gehören

#### 2. Validation in create_thought / patch_thought
- Prüfen: `workspace_id` muss gesetzt sein
- Prüfen: Wenn `session_id` gesetzt, dann muss `workspace_id` auch gesetzt sein
- Prüfen: Wenn `session_id` gesetzt, dann muss es ein Thought mit diesem `session_id` UND `workspace_id` geben (oder Session innerhalb Workspace existieren)

#### 3. Sessions-Endpoints anpassen
- `GET /v1/memory/sessions` → `GET /v1/memory/workspace/{workspace_id}/sessions`
- Alle Sessions-Endpoints müssen `workspace_id` Parameter haben
- Sessions nur innerhalb eines Workspace auflisten/managen

#### 4. Workspace-Endpoints erweitern
- `GET /v1/memory/workspace/{workspace_id}/sessions` - Liste aller Sessions innerhalb Workspace

### Frontend

#### 1. SessionWorkspaceSelector anpassen
- Workspace **required** (nicht optional)
- Sessions nur aus dem gewählten Workspace laden
- Reihenfolge: Erst Workspace wählen, dann Session (optional)

#### 2. Sessions-Seite entfernen
- `/manifold/sessions` entfernen oder umschreiben
- Sessions nur noch in Workspace-Detail-Seite verwalten

#### 3. Workspace-Detail-Seite erweitern
- Neuer Tab "Sessions" hinzufügen
- Liste aller Sessions innerhalb des Workspace
- Session-Detail-Seiten weiterhin unterstützen (aber nur über Workspace-Zugriff)

#### 4. Dashboard anpassen
- Sessions-Panel entfernen
- Nur Workspaces zeigen

#### 5. Navigation anpassen
- "Sessions" Link entfernen oder zu Workspaces umleiten

## Migration-Strategie

### Option 1: Soft Migration (Empfohlen)
- `workspace_id` bleibt zunächst optional im Schema
- Validation in Endpoints: Wenn `session_id` gesetzt, dann `workspace_id` required
- Default-Workspace für bestehende Thoughts: "unassigned" oder automatisch erstellen

### Option 2: Hard Migration
- `workspace_id` required im Schema
- Migration-Script: Alle Thoughts ohne `workspace_id` bekommen Default-Workspace "unassigned"
- Alle Thoughts mit `session_id` aber ohne `workspace_id` bekommen Workspace basierend auf Session

## Empfehlung

**Option 1 (Soft Migration)** ist sicherer:
1. Schema bleibt flexibel (workspace_id optional)
2. Validation in Endpoints erzwungen
3. Neue Thoughts müssen workspace_id haben
4. Bestehende Thoughts funktionieren weiter (mit Warnung)

## Implementierungsreihenfolge

1. **Backend Validation** hinzufügen (create_thought, patch_thought)
2. **Sessions-Endpoints** anpassen (workspace_id Parameter)
3. **Workspace-Endpoints** erweitern (Sessions auflisten)
4. **Frontend SessionWorkspaceSelector** anpassen
5. **Frontend Workspace-Detail** erweitern (Sessions-Tab)
6. **Frontend Sessions-Seite** entfernen/anpassen
7. **Navigation** anpassen


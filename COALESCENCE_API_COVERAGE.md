# Coalescence Frontend API Coverage Analysis

## ORCHESTRATOR API (Port 3100) - 27 Endpunkte

### ✅ GENUTZT (12 Endpunkte - 44%)
1. ✅ GET /api/agents - Agent stats
2. ✅ GET /api/runs - List runs
3. ✅ GET /api/runs/:id - Run details
4. ✅ GET /api/stats/dashboard - Dashboard stats
5. ✅ POST /api/agents/:agentName/run - Trigger agent
6. ✅ GET /api/rules - List rules
7. ✅ POST /api/rules - Create rule
8. ✅ PUT /api/rules/:id - Update rule
9. ✅ DELETE /api/rules/:id - Delete rule

### ❌ NICHT GENUTZT (15 Endpunkte - 56%)
1. ❌ GET /api/runs/:id/chat - Complete chat history
2. ❌ GET /api/runs/:id/tools - Tool calls
3. ❌ GET /api/runs/:id/tools/detailed - Detailed tool breakdown
4. ❌ GET /api/costs - Daily cost breakdown
5. ❌ GET /api/stats/agent/:name - Agent stats summary
6. ❌ GET /api/stats/costs - Cost breakdown by agent/date
7. ❌ GET /api/stats/tokens - Token analytics
8. ❌ GET /api/logs/agents - All agent stats
9. ❌ GET /api/logs/runs/:agent - Agent-specific runs
10. ❌ GET /api/config/models - Models config (für Preisinfo)
11. ❌ PUT /api/config/models - Update models config
12. ❌ POST /api/agents/reload - Reload agents
13. ❌ GET /api/rules/:id - Single rule details
14. ❌ GET /api/turns/:turnId/rules - Turn rules
15. ❌ POST /api/turns/:turnId/rules - Set turn rules

## COALESCENCE API (Port 8084) - 11 Endpunkte

### ✅ GENUTZT (4 Endpunkte - 36%)
1. ✅ GET /v1/agents - List agents
2. ✅ POST /v1/agents - Create agent
3. ✅ PATCH /v1/agents/:name - Update agent
4. ✅ DELETE /v1/agents/:name - Delete agent

### ❌ NICHT GENUTZT (7 Endpunkte - 64%)
1. ❌ GET /v1/agents/:name - Get single agent (wichtig für Edit!)
2. ❌ POST /v1/agents/:name/trigger - Trigger agent (Alternative)
3. ❌ GET /v1/context/:agent_name - Load run context
4. ❌ POST /v1/context - Save run context
5. ❌ GET /v1/insights/:agent_name - Get insights
6. ❌ POST /v1/insights - Save insights
7. ❌ GET /v1/messages/:agent_name - Get messages
8. ❌ POST /v1/messages - Send message
9. ❌ PATCH /v1/messages/:message_id/read - Mark read
10. ❌ GET /v1/tools - List all tools
11. ❌ GET /v1/tools/:mcp_name - List MCP tools

## FEHLENDE FEATURES IM FRONTEND

### 🔴 KRITISCH (Sofort implementieren)
1. **GET /v1/agents/:name** - Agent Details beim Edit laden
2. **GET /api/runs/:id/tools/detailed** - Tool Breakdown in Run Detail View
3. **GET /api/stats/agent/:name** - Agent-spezifische Stats-Seite

### 🟡 WICHTIG (Nächste Iteration)
4. **Context System** - Pre-Run Context laden, Post-Run Context speichern
5. **Insights System** - Insights anzeigen pro Agent
6. **Messages System** - Agent-to-Agent Kommunikation
7. **Tools Browser** - Alle verfügbaren Tools anzeigen
8. **Cost Analytics** - Detaillierte Cost Breakdowns
9. **Token Analytics** - Token Usage Charts

### 🟢 OPTIONAL (Nice-to-have)
10. **Models Config** - Preis-Info anzeigen
11. **Turn Rules** - Turn-spezifische Rules verwalten
12. **Agent Reload** - Manueller Reload Button

## EMPFOHLENE IMPLEMENTIERUNG

### Phase 1: Run Detail Enhancement
- Tool Breakdown Tab in Run Detail View
- Chat History besser darstellen

### Phase 2: Agent Management Enhancement
- Agent Detail View mit Stats
- Context/Insights/Messages anzeigen

### Phase 3: Analytics Dashboard
- Cost/Token Charts
- Agent-spezifische Analytics

### Phase 4: Advanced Features
- Tools Browser
- Inter-Agent Kommunikation


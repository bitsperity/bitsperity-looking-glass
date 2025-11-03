<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { coalescenceClient } from '$lib/coalescence-client';
  import ToolSelector from './ToolSelector.svelte';
  
  export let agent: any = null;
  export let availableRules: any[] = [];

  const dispatch = createEventDispatcher();
  
  // Sidebar navigation sections
  type Section = 'basic' | 'turns' | 'tools' | 'rules' | 'advanced';
  let activeSection: Section = 'basic';
  
  // Available MCPs
  const availableMCPs = ['satbase', 'tesseract', 'manifold', 'ariadne', 'coalescence', 'telegram'];
  
  const mcpLabels: Record<string, string> = {
    'satbase': '📊 Satbase',
    'tesseract': '🔍 Tesseract',
    'manifold': '🧠 Manifold',
    'ariadne': '🕸️ Ariadne',
    'coalescence': '⚙️ Coalescence',
    'telegram': '📱 Telegram'
  };
  
  // Schedule options
  let scheduleType: 'manual' | 'interval' | 'scheduled' | 'cron' = 'manual';
  let intervalValue = 60;
  let intervalUnit: 'minutes' | 'hours' = 'minutes';
  let scheduledTime = '09:00';
  let customCron = '0 * * * *';
  
  // Models config
  let modelsConfig: Record<string, any> = {};
  let loadingModels = false;
  
  // Form state
  let formData = {
    name: '',
    enabled: true,
    model: 'haiku-3.5',
    schedule: 'manual',
    timeout_minutes: 10,
    budget_daily_tokens: 5000,
    max_tokens_per_turn: undefined as number | undefined,
    max_steps: 5,
    system_prompt: '',
    turns: [] as any[]
  };
  
  // Track tool selection mode per turn: 'mcp' or 'tools'
  let turnToolModes: Record<number, 'mcp' | 'tools'> = {};
  
  // Tooltip state
  let hoveredRule: { turnIndex: number; ruleId: string } | null = null;
  
  // Selected turn for tools/rules editing
  let selectedTurnIndex: number | null = null;

  // Modal state for adding turns
  let showAddTurnModal = false;
  let insertAfterIndex: number | null = null;

  async function loadModelsConfig() {
    if (Object.keys(modelsConfig).length > 0) return;
    
    try {
      loadingModels = true;
      modelsConfig = await coalescenceClient.getAllModels();
    } catch (e) {
      console.warn('Failed to load models config:', e);
    } finally {
      loadingModels = false;
    }
  }

  function getModelInfo(modelName: string) {
    const model = modelsConfig[modelName];
    if (!model) return null;
    
    return {
      pricing: model.pricing,
      notes: model.notes,
      provider: model.provider
    };
  }

  function formatModelPricing(pricing: any): string {
    if (!pricing) return '';
    return `$${pricing.input_mtok.toFixed(2)}/$${pricing.output_mtok.toFixed(2)} per 1M tokens`;
  }

  $: if (!loadingModels) {
    loadModelsConfig();
  }

  onMount(() => {
    loadModelsConfig();
  });
  
  function initializeFormData() {
    if (!agent) return;
    
    const isAgentConfig = 'turns' in agent && Array.isArray(agent.turns);
    const agentData = isAgentConfig ? agent : agent.config;
    const agentName = agent.name || agentData?.name || agent.agent || '';
    
    formData = {
      name: agentName,
      enabled: isAgentConfig ? (agent as any).enabled ?? true : agentData?.enabled ?? true,
      model: isAgentConfig ? (agent as any).model || 'haiku-3.5' : agentData?.model || 'haiku-3.5',
      schedule: isAgentConfig ? (agent as any).schedule || 'manual' : agentData?.schedule || 'manual',
      timeout_minutes: isAgentConfig ? (agent as any).timeout_minutes || 10 : agentData?.timeout_minutes || 10,
      budget_daily_tokens: isAgentConfig ? (agent as any).budget_daily_tokens || 5000 : agentData?.budget_daily_tokens || 5000,
      max_tokens_per_turn: isAgentConfig ? (agent as any).max_tokens_per_turn : agentData?.max_tokens_per_turn,
      max_steps: isAgentConfig ? (agent as any).max_steps || 5 : agentData?.max_steps || 5,
      system_prompt: isAgentConfig ? (agent as any).system_prompt || '' : agentData?.system_prompt || '',
      turns: (isAgentConfig ? (agent as any).turns || [] : agentData?.turns || []).map((turn: any, idx: number) => {
        const hasTools = turn.tools && (Array.isArray(turn.tools) ? turn.tools.length > 0 : (typeof turn.tools === 'string' ? JSON.parse(turn.tools).length > 0 : false));
        if (hasTools) {
          turnToolModes[idx] = 'tools';
        } else {
          turnToolModes[idx] = 'mcp';
        }
        
        return {
          id: turn.id || turn.turn_id,
          name: turn.name || turn.turn_name || '',
          max_tokens: turn.max_tokens || 1500,
          max_steps: turn.max_steps,
          model: turn.model,
          mcps: turn.mcps ? (Array.isArray(turn.mcps) ? turn.mcps : JSON.parse(turn.mcps)) : [],
          tools: turn.tools ? (Array.isArray(turn.tools) ? turn.tools : (typeof turn.tools === 'string' ? JSON.parse(turn.tools) : [])) : [],
          prompt: turn.prompt || '',
          prompt_file: turn.prompt_file,
          rules: turn.rules ? (Array.isArray(turn.rules) ? turn.rules : JSON.parse(turn.rules)) : []
        };
      })
    };
    parseSchedule(formData.schedule);
  }
  
  function initializeNewAgent() {
    if (agent) return;
    
    formData = {
      name: '',
      enabled: true,
      model: 'haiku-3.5',
      schedule: 'manual',
      timeout_minutes: 10,
      budget_daily_tokens: 5000,
      max_tokens_per_turn: undefined,
      max_steps: 5,
      system_prompt: '',
      turns: []
    };
    scheduleType = 'manual';
  }
  
  $: if (agent) {
    initializeFormData();
  } else {
    initializeNewAgent();
  }
  
  function parseSchedule(schedule: string) {
    if (schedule === 'manual') {
      scheduleType = 'manual';
    } else if (schedule.startsWith('*/')) {
      scheduleType = 'interval';
      const match = schedule.match(/\*\/(\d+)/);
      if (match) {
        intervalValue = parseInt(match[1]);
        intervalUnit = 'minutes';
      }
    } else if (schedule.match(/^\d+ \d+ \* \* \*$/)) {
      scheduleType = 'scheduled';
      const parts = schedule.split(' ');
      scheduledTime = `${parts[1].padStart(2, '0')}:${parts[0].padStart(2, '0')}`;
    } else {
      scheduleType = 'cron';
      customCron = schedule;
    }
  }
  
  function buildSchedule(): string {
    if (scheduleType === 'manual') return 'manual';
    if (scheduleType === 'interval') {
      const minutes = intervalUnit === 'hours' ? intervalValue * 60 : intervalValue;
      return `*/${minutes} * * * *`;
    }
    if (scheduleType === 'scheduled') {
      const [hours, minutes] = scheduledTime.split(':');
      return `${minutes} ${hours} * * *`;
    }
    return customCron;
  }
  
  function save() {
    if (!formData.name || formData.name.trim() === '') {
      alert('Bitte geben Sie einen Namen für den Agent ein');
      return;
    }
    
    formData.schedule = buildSchedule();
    dispatch('save', formData);
  }
  
  function openAddTurnModal(afterIndex: number | null = null) {
    insertAfterIndex = afterIndex;
    showAddTurnModal = true;
  }

  function closeAddTurnModal() {
    showAddTurnModal = false;
    insertAfterIndex = null;
  }

  function addTurnAtPosition() {
    const newTurn = {
      id: formData.turns.length,
      name: '',
      model: formData.model,
      max_tokens: 1500,
      max_steps: undefined,
      mcps: [],
      tools: [],
      prompt: '',
      rules: []
    };

    if (insertAfterIndex === null) {
      // Add at the end
      formData.turns = [...formData.turns, newTurn];
      selectedTurnIndex = formData.turns.length - 1;
    } else {
      // Insert after specified index
      const newTurns = [...formData.turns];
      newTurns.splice(insertAfterIndex + 1, 0, newTurn);
      formData.turns = newTurns;
      selectedTurnIndex = insertAfterIndex + 1;
    }

    turnToolModes[selectedTurnIndex] = 'mcp';
    activeSection = 'turns';
    closeAddTurnModal();
  }

  function addTurn() {
    // Backward compatibility: add at end
    openAddTurnModal(null);
  }

  function removeTurn(index: number) {
    formData.turns = formData.turns.filter((_, i) => i !== index);
    formData = { ...formData };
    if (selectedTurnIndex !== null && selectedTurnIndex === index) {
      selectedTurnIndex = formData.turns.length > 0 ? Math.max(0, index - 1) : null;
    } else if (selectedTurnIndex !== null && selectedTurnIndex > index) {
      selectedTurnIndex = selectedTurnIndex - 1;
    }
  }

  function moveTurnUp(index: number) {
    if (index === 0) return;
    const newTurns = [...formData.turns];
    const newModes: Record<number, 'mcp' | 'tools'> = { ...turnToolModes };
    
    // Swap turns
    [newTurns[index - 1], newTurns[index]] = [newTurns[index], newTurns[index - 1]];
    
    // Swap tool modes
    const modeA = newModes[index - 1];
    const modeB = newModes[index];
    if (modeA !== undefined) newModes[index] = modeA;
    if (modeB !== undefined) newModes[index - 1] = modeB;
    if (modeA === undefined) delete newModes[index - 1];
    if (modeB === undefined) delete newModes[index];
    
    formData.turns = newTurns;
    turnToolModes = newModes;
    
    if (selectedTurnIndex === index) {
      selectedTurnIndex = index - 1;
    } else if (selectedTurnIndex === index - 1) {
      selectedTurnIndex = index;
    }
  }

  function moveTurnDown(index: number) {
    if (index >= formData.turns.length - 1) return;
    const newTurns = [...formData.turns];
    const newModes: Record<number, 'mcp' | 'tools'> = { ...turnToolModes };
    
    // Swap turns
    [newTurns[index], newTurns[index + 1]] = [newTurns[index + 1], newTurns[index]];
    
    // Swap tool modes
    const modeA = newModes[index];
    const modeB = newModes[index + 1];
    if (modeA !== undefined) newModes[index + 1] = modeA;
    if (modeB !== undefined) newModes[index] = modeB;
    if (modeA === undefined) delete newModes[index + 1];
    if (modeB === undefined) delete newModes[index];
    
    formData.turns = newTurns;
    turnToolModes = newModes;
    
    if (selectedTurnIndex === index) {
      selectedTurnIndex = index + 1;
    } else if (selectedTurnIndex === index + 1) {
      selectedTurnIndex = index;
    }
  }
  
  const sections: Array<{ id: Section; label: string; icon: string; description: string }> = [
    { id: 'basic', label: 'Basis', icon: '⚡', description: 'Name, Model, Schedule' },
    { id: 'turns', label: 'Turns', icon: '🔄', description: `${formData.turns.length} Turn${formData.turns.length !== 1 ? 's' : ''}` },
    { id: 'tools', label: 'Tools', icon: '🔧', description: 'Tool-Auswahl' },
    { id: 'rules', label: 'Regeln', icon: '📋', description: 'Turn-Regeln' },
    { id: 'advanced', label: 'Erweitert', icon: '⚙️', description: 'Optionale Einstellungen' }
  ];
</script>

<div class="agent-edit-view">
  <!-- Header -->
  <div class="header">
    <div class="header-content">
      <div>
        <h1 class="title">
          <span class="icon">⚙️</span>
          {agent?.name || agent?.agent || formData.name || 'Neuer Agent'}
        </h1>
        <p class="subtitle">
          {agent ? 'Agent konfigurieren und bearbeiten' : 'Erstelle einen neuen Orchestrator-Agent'}
        </p>
      </div>
      <div class="header-actions">
        <button
          on:click={() => dispatch('cancel')}
          class="btn-secondary"
        >
          Abbrechen
        </button>
        <button
          on:click={save}
          class="btn-primary"
        >
          <span>💾</span>
          Speichern
        </button>
      </div>
    </div>
  </div>

  <!-- Main Content: Split View -->
  <div class="main-content">
    <!-- Sidebar Navigation -->
    <aside class="sidebar">
      <nav class="sidebar-nav">
        {#each sections as section}
          {@const isActive = activeSection === section.id}
          {@const hasBadge = section.id === 'turns' && formData.turns.length > 0}
          <button
            on:click={() => {
              activeSection = section.id;
              if (section.id === 'tools' || section.id === 'rules') {
                if (formData.turns.length > 0 && selectedTurnIndex === null) {
                  selectedTurnIndex = 0;
                }
              }
            }}
            class="nav-item {isActive ? 'active' : ''}"
          >
            <div class="nav-item-content">
              <span class="nav-icon">{section.icon}</span>
              <div class="nav-text">
                <div class="nav-label">{section.label}</div>
                <div class="nav-description">{section.description}</div>
              </div>
              {#if hasBadge}
                <span class="nav-badge">{formData.turns.length}</span>
              {/if}
            </div>
            {#if isActive}
              <div class="nav-indicator"></div>
            {/if}
          </button>
        {/each}
      </nav>
    </aside>

    <!-- Main Content Area -->
    <main class="content-area">
      <div class="content-scroll">
        {#if activeSection === 'basic'}
          <!-- Basic Configuration -->
          <div class="section-content">
            <h2 class="section-title">⚡ Basis-Konfiguration</h2>
            <p class="section-description">Grundlegende Einstellungen für den Agent</p>

            <div class="config-grid">
              <!-- Name & Status -->
              <div class="config-card">
                <label class="config-label">Agent Name</label>
                <input
                  type="text"
                  bind:value={formData.name}
                  placeholder="z.B. discovery, analyst_tech"
                  class="input-large"
                  disabled={!!agent}
                />
                {#if agent}
                  <p class="input-hint">Name kann nachträglich nicht geändert werden</p>
                {/if}
              </div>

              <div class="config-card">
                <label class="config-label">Status</label>
                <label class="toggle-card">
                  <input
                    type="checkbox"
                    bind:checked={formData.enabled}
                    class="toggle-input"
                  />
                  <div class="toggle-content">
                    <div class="toggle-label">{formData.enabled ? 'Aktiviert' : 'Deaktiviert'}</div>
                    <div class="toggle-description">Agent ist {formData.enabled ? 'aktiv und läuft automatisch' : 'inaktiv'}</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Model Selection -->
            <div class="config-card-full">
              <label class="config-label">KI Model</label>
              {#if loadingModels}
                <div class="loading-state">Loading model prices...</div>
              {:else}
                <div class="model-grid">
                  {#each Object.entries(modelsConfig).filter(([key]) => !key.startsWith('deprecated')) as [modelKey, modelData]}
                    {@const modelName = modelKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {@const icon = modelKey.includes('haiku') ? '⚡' : modelKey.includes('sonnet') ? '🎯' : modelKey.includes('opus') ? '💎' : '🤖'}
                    {@const isSelected = formData.model === modelKey}
                    {@const pricing = modelData.pricing}
                    {@const costEstimate = pricing ? (
                      (formData.budget_daily_tokens / 1_000_000) * ((pricing.input_mtok * 0.8) + (pricing.output_mtok * 0.2))
                    ).toFixed(4) : null}
                    <label class="model-card {isSelected ? 'selected' : ''}">
                      <input
                        type="radio"
                        bind:group={formData.model}
                        value={modelKey}
                        class="model-radio"
                      />
                      <div class="model-content">
                        <div class="model-header">
                          <span class="model-icon">{icon}</span>
                          <span class="model-name">{modelName}</span>
                        </div>
                        {#if modelData.notes}
                          <div class="model-notes">{modelData.notes}</div>
                        {/if}
                        {#if pricing}
                          <div class="model-pricing">
                            <div class="pricing-text">💵 {formatModelPricing(pricing)}</div>
                            {#if costEstimate && formData.budget_daily_tokens > 0}
                              <div class="pricing-estimate">
                                Est. ~${costEstimate}/day bei {formData.budget_daily_tokens.toLocaleString()} tokens
                              </div>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    </label>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Schedule -->
            <div class="config-card-full">
              <label class="config-label">Schedule / Ausführung</label>
              <div class="schedule-options">
                {#each [
                  { value: 'manual', label: 'Manuell', icon: '✋' },
                  { value: 'interval', label: 'Intervall', icon: '⏱️' },
                  { value: 'scheduled', label: 'Geplant', icon: '📅' },
                  { value: 'cron', label: 'Cron', icon: '⚙️' }
                ] as type}
                  <button
                    on:click={() => scheduleType = type.value}
                    class="schedule-btn {scheduleType === type.value ? 'active' : ''}"
                  >
                    <span>{type.icon}</span>
                    {type.label}
                  </button>
                {/each}
              </div>
              
              {#if scheduleType === 'manual'}
                <div class="schedule-info">ℹ️ Agent wird nur manuell über den "Run"-Button gestartet</div>
              {:else if scheduleType === 'interval'}
                <div class="schedule-inputs">
                  <input
                    type="number"
                    bind:value={intervalValue}
                    min="1"
                    class="input-number"
                    placeholder="60"
                  />
                  <select
                    bind:value={intervalUnit}
                    class="select"
                  >
                    <option value="minutes">Minuten</option>
                    <option value="hours">Stunden</option>
                  </select>
                </div>
                <div class="schedule-info">⏱️ Agent läuft alle {intervalValue} {intervalUnit === 'hours' ? 'Stunden' : 'Minuten'}</div>
              {:else if scheduleType === 'scheduled'}
                <input
                  type="time"
                  bind:value={scheduledTime}
                  class="input-time"
                />
                <div class="schedule-info">📅 Agent läuft täglich um {scheduledTime} Uhr</div>
              {:else}
                <input
                  type="text"
                  bind:value={customCron}
                  placeholder="0 * * * *"
                  class="input-cron"
                />
                <div class="schedule-info">⚙️ Cron Expression: <code>{customCron}</code></div>
              {/if}
            </div>

            <!-- System Prompt -->
            <div class="config-card-full">
              <label class="config-label">System Prompt</label>
              <textarea
                bind:value={formData.system_prompt}
                rows={15}
                placeholder="System-Anweisungen für den Agent...

Beispiel:
Du bist ein Agent, der Märkte analysiert. Deine Aufgabe ist es, Signale zu finden und in Thoughts zu speichern."
                class="textarea-large system-prompt-textarea"
              />
            </div>
          </div>

        {:else if activeSection === 'turns'}
          <!-- Turns Configuration -->
          <div class="section-content">
            <div class="section-header">
              <div>
                <h2 class="section-title">🔄 Turn-Konfiguration</h2>
                <p class="section-description">Definiere die Schritte, die der Agent ausführen soll</p>
              </div>
              <button
                on:click={addTurn}
                class="btn-primary"
              >
                <span>➕</span>
                Turn hinzufügen
              </button>
            </div>
            
            {#if formData.turns.length === 0}
              <div class="empty-state">
                <div class="empty-icon">🔄</div>
                <div class="empty-title">Noch keine Turns definiert</div>
                <p class="empty-description">Erstelle Turns, um den Agent-Workflow zu definieren</p>
                <button
                  on:click={addTurn}
                  class="btn-primary"
                >
                  <span>➕</span>
                  Ersten Turn erstellen
                </button>
              </div>
            {:else}
              <div class="turns-list">
                {#each formData.turns as turn, i (turn.name + i)}
                  <div class="turn-card">
                    <div class="turn-header">
                      <div class="turn-left">
                        <div class="turn-number">{i + 1}</div>
                        <div class="turn-info">
                          <input
                            type="text"
                            bind:value={turn.name}
                            placeholder={`Turn ${i + 1}`}
                            class="turn-name-input"
                          />
                          <div class="turn-meta">
                            Max {turn.max_tokens || 1500} Tokens
                            {#if turn.max_steps}
                              · {turn.max_steps} Steps
                            {/if}
                          </div>
                        </div>
                      </div>
                      <div class="turn-actions">
                        <div class="turn-reorder">
                          <button
                            on:click={() => moveTurnUp(i)}
                            disabled={i === 0}
                            class="btn-reorder {i === 0 ? 'disabled' : ''}"
                            title="Nach oben"
                          >
                            ⬆️
                          </button>
                          <button
                            on:click={() => moveTurnDown(i)}
                            disabled={i >= formData.turns.length - 1}
                            class="btn-reorder {i >= formData.turns.length - 1 ? 'disabled' : ''}"
                            title="Nach unten"
                          >
                            ⬇️
                          </button>
                        </div>
                        <button
                          on:click={() => openAddTurnModal(i)}
                          class="btn-add-after"
                          title="Turn danach einfügen"
                        >
                          ➕
                        </button>
                        <button
                          on:click={() => removeTurn(i)}
                          class="btn-danger-small"
                        >
                          🗑️ Löschen
                        </button>
                      </div>
                    </div>
                    
                    <div class="turn-fields">
                      <div class="turn-field">
                        <label class="field-label">Max Tokens</label>
                        <input
                          type="number"
                          bind:value={turn.max_tokens}
                          min="100"
                          max="8000"
                          step="100"
                          class="input-field"
                        />
                      </div>
                      <div class="turn-field">
                        <label class="field-label">Max Steps</label>
                        <input
                          type="number"
                          bind:value={turn.max_steps}
                          min="1"
                          max="50"
                          step="1"
                          placeholder="Optional"
                          class="input-field"
                        />
                        <p class="field-hint">Tool-Call-Iterationen (falls leer: Agent-Standard)</p>
                      </div>
                      <div class="turn-field">
                        <label class="field-label">Model (für diesen Turn)</label>
                        <select
                          bind:value={turn.model}
                          class="select-field"
                        >
                          <option value="haiku-3.5">⚡ Haiku 3.5 (Schnell & günstig)</option>
                          <option value="haiku-4.5">🚀 Haiku 4.5 (Verbessert & schnell)</option>
                          <option value="sonnet-4.5">🎯 Sonnet 4.5 (Balanced)</option>
                          <option value="opus-4.1">💎 Opus 4.1 (Höchste Qualität)</option>
                        </select>
                        <p class="field-hint">Überschreibt das Agent-Standard-Model für diesen Turn</p>
                      </div>
                    </div>

                    <div class="turn-prompt">
                      <label class="field-label">Prompt</label>
                      <textarea
                        bind:value={turn.prompt}
                        rows={20}
                        placeholder="Was soll in diesem Turn passieren?

Beispiel:
Lade die Watchlist und prüfe welche Tickers heute relevant sind..."
                        class="textarea-field turn-prompt-textarea"
                      />
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

        {:else if activeSection === 'tools'}
          <!-- Tools Configuration -->
          <div class="section-content">
            <h2 class="section-title">🔧 Tool-Auswahl</h2>
            <p class="section-description">Wähle Tools für jeden Turn aus</p>

            {#if formData.turns.length === 0}
              <div class="empty-state">
                <div class="empty-icon">🔄</div>
                <div class="empty-title">Erstelle zuerst Turns</div>
                <p class="empty-description">Du musst mindestens einen Turn erstellen, bevor du Tools auswählen kannst</p>
                <button
                  on:click={() => { addTurn(); activeSection = 'turns'; }}
                  class="btn-primary"
                >
                  <span>➕</span>
                  Turn erstellen
                </button>
              </div>
            {:else}
              <div class="turn-selector-section">
                <label class="config-label">Turn auswählen</label>
                <div class="turn-selector">
                  {#each formData.turns as turn, i}
                    <button
                      on:click={() => selectedTurnIndex = i}
                      class="turn-selector-btn {selectedTurnIndex === i ? 'active' : ''}"
                    >
                      <span class="turn-selector-number">{i + 1}</span>
                      <span class="turn-selector-name">{turn.name || `Turn ${i + 1}`}</span>
                    </button>
                  {/each}
                </div>
              </div>

              {#if selectedTurnIndex !== null}
                {@const currentTurn = formData.turns[selectedTurnIndex]}
                <div class="tool-selection-section">
                  <div class="tool-mode-toggle">
                    <label class="config-label">Tool-Auswahl Modus</label>
                    <div class="toggle-group">
                      <button
                        type="button"
                        on:click={() => {
                          turnToolModes[selectedTurnIndex] = 'mcp';
                          if (!formData.turns[selectedTurnIndex].tools) formData.turns[selectedTurnIndex].tools = [];
                          formData.turns[selectedTurnIndex].tools = [];
                          formData.turns = [...formData.turns];
                        }}
                        class="toggle-btn {(turnToolModes[selectedTurnIndex] || 'mcp') === 'mcp' ? 'active' : ''}"
                      >
                        MCP (alt)
                      </button>
                      <button
                        type="button"
                        on:click={() => {
                          turnToolModes[selectedTurnIndex] = 'tools';
                          if (!formData.turns[selectedTurnIndex].tools) formData.turns[selectedTurnIndex].tools = [];
                          formData.turns[selectedTurnIndex].mcps = [];
                          formData.turns = [...formData.turns];
                        }}
                        class="toggle-btn {(turnToolModes[selectedTurnIndex] || 'mcp') === 'tools' ? 'active' : ''}"
                      >
                        Tools (neu)
                      </button>
                    </div>
                  </div>

                  {#if (turnToolModes[selectedTurnIndex] || 'mcp') === 'tools'}
                    <div class="tool-selector-container">
                      {#key selectedTurnIndex}
                        <ToolSelector
                          selectedTools={formData.turns[selectedTurnIndex]?.tools || []}
                          onToolsChange={(tools) => {
                            formData.turns[selectedTurnIndex].tools = tools;
                            formData.turns = [...formData.turns];
                          }}
                        />
                      {/key}
                    </div>
                  {:else}
                    <div class="mcp-selection">
                      <div class="mcp-grid">
                        {#each availableMCPs as mcp}
                          <label class="mcp-card {(formData.turns[selectedTurnIndex]?.mcps || []).includes(mcp) ? 'selected' : ''}">
                            <input
                              type="checkbox"
                              checked={(formData.turns[selectedTurnIndex]?.mcps || []).includes(mcp)}
                              on:change={(e) => {
                                const isChecked = e.currentTarget.checked;
                                const mcps = formData.turns[selectedTurnIndex].mcps || [];
                                if (isChecked && !mcps.includes(mcp)) {
                                  formData.turns[selectedTurnIndex].mcps = [...mcps, mcp];
                                } else if (!isChecked && mcps.includes(mcp)) {
                                  formData.turns[selectedTurnIndex].mcps = mcps.filter(m => m !== mcp);
                                }
                                formData.turns = [...formData.turns];
                              }}
                              class="mcp-checkbox"
                            />
                            <span class="mcp-label">{mcpLabels[mcp] || mcp}</span>
                          </label>
                        {/each}
                      </div>
                      {#if formData.turns[selectedTurnIndex]?.mcps?.length > 0}
                        <div class="mcp-hint">
                          Aktiv: {formData.turns[selectedTurnIndex].mcps.join(', ')}
                          <br />
                          <span>💡 Tipp: Wechsle zu "Tools (neu)" für präzise Tool-Auswahl</span>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            {/if}
          </div>

        {:else if activeSection === 'rules'}
          <!-- Rules Configuration -->
          <div class="section-content">
            <h2 class="section-title">📋 Regeln</h2>
            <p class="section-description">Wähle Regeln für jeden Turn aus</p>

            {#if formData.turns.length === 0}
              <div class="empty-state">
                <div class="empty-icon">🔄</div>
                <div class="empty-title">Erstelle zuerst Turns</div>
                <p class="empty-description">Du musst mindestens einen Turn erstellen, bevor du Regeln auswählen kannst</p>
                <button
                  on:click={() => { addTurn(); activeSection = 'turns'; }}
                  class="btn-primary"
                >
                  <span>➕</span>
                  Turn erstellen
                </button>
              </div>
            {:else}
              <div class="turn-selector-section">
                <label class="config-label">Turn auswählen</label>
                <div class="turn-selector">
                  {#each formData.turns as turn, i}
                    <button
                      on:click={() => selectedTurnIndex = i}
                      class="turn-selector-btn {selectedTurnIndex === i ? 'active' : ''}"
                    >
                      <span class="turn-selector-number">{i + 1}</span>
                      <span class="turn-selector-name">{turn.name || `Turn ${i + 1}`}</span>
                    </button>
                  {/each}
                </div>
              </div>

              {#if selectedTurnIndex !== null}
                <div class="rules-selection">
                  <div class="rules-grid">
                    {#each availableRules as rule (rule.id)}
                      <div class="rule-card-wrapper">
                        <label 
                          class="rule-card {(formData.turns[selectedTurnIndex]?.rules || []).includes(rule.id) ? 'selected' : ''}"
                          on:mouseenter={() => hoveredRule = { turnIndex: selectedTurnIndex, ruleId: rule.id }}
                          on:mouseleave={() => hoveredRule = null}
                        >
                          <input
                            type="checkbox"
                            checked={(formData.turns[selectedTurnIndex]?.rules || []).includes(rule.id)}
                            on:change={(e) => {
                              const isChecked = e.currentTarget.checked;
                              const rules = formData.turns[selectedTurnIndex].rules || [];
                              if (isChecked && !rules.includes(rule.id)) {
                                formData.turns[selectedTurnIndex].rules = [...rules, rule.id];
                              } else if (!isChecked && rules.includes(rule.id)) {
                                formData.turns[selectedTurnIndex].rules = rules.filter(r => r !== rule.id);
                              }
                              formData.turns = [...formData.turns];
                              formData = { ...formData };
                            }}
                            class="rule-checkbox"
                          />
                          <div class="rule-content">
                            <div class="rule-name">{rule.name}</div>
                            {#if (formData.turns[selectedTurnIndex]?.rules || []).includes(rule.id)}
                              <span class="rule-checkmark">✓</span>
                            {/if}
                          </div>
                        </label>
                        
                        {#if hoveredRule?.turnIndex === selectedTurnIndex && hoveredRule?.ruleId === rule.id && rule.content}
                          <div class="rule-tooltip">
                            <div class="tooltip-header">
                              <span>📋</span>
                              <span>Regel-Inhalt</span>
                            </div>
                            <div class="tooltip-content">{rule.content}</div>
                            <div class="tooltip-arrow"></div>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                  {#if formData.turns[selectedTurnIndex]?.rules?.length > 0}
                    <div class="rules-active">
                      Aktiv: {formData.turns[selectedTurnIndex].rules.map(ruleId => {
                        const rule = availableRules.find(r => r.id === ruleId);
                        return rule?.name || ruleId;
                      }).join(', ')}
                    </div>
                  {/if}
                </div>
              {/if}
            {/if}
          </div>

        {:else if activeSection === 'advanced'}
          <!-- Advanced Configuration -->
          <div class="section-content">
            <h2 class="section-title">⚙️ Erweiterte Einstellungen</h2>
            <p class="section-description">Optionale Konfiguration für Power-User</p>

            <div class="config-grid">
              <div class="config-card">
                <label class="config-label">Timeout</label>
                <div class="input-with-unit">
                  <input
                    type="number"
                    bind:value={formData.timeout_minutes}
                    min="1"
                    max="60"
                    class="input-field"
                  />
                  <span class="input-unit">Minuten</span>
                </div>
                <p class="input-hint">Maximale Laufzeit pro Run</p>
              </div>
              
              <div class="config-card">
                <label class="config-label">Token Budget (täglich)</label>
                <div class="input-with-unit">
                  <input
                    type="number"
                    bind:value={formData.budget_daily_tokens}
                    min="1000"
                    step="1000"
                    class="input-field"
                  />
                  <span class="input-unit">Tokens</span>
                </div>
                <p class="input-hint">Budget-Limit pro Tag</p>
              </div>
            </div>

            <div class="config-grid">
              <div class="config-card">
                <label class="config-label">Max Tokens pro Turn</label>
                <div class="input-with-unit">
                  <input
                    type="number"
                    bind:value={formData.max_tokens_per_turn}
                    min="500"
                    max="8000"
                    step="100"
                    placeholder="Optional"
                    class="input-field"
                  />
                  <span class="input-unit">Tokens</span>
                </div>
                <p class="input-hint">Optional: Max Tokens pro Turn (überschreibt Turn-Level)</p>
              </div>
              
              <div class="config-card">
                <label class="config-label">Max Steps</label>
                <div class="input-with-unit">
                  <input
                    type="number"
                    bind:value={formData.max_steps}
                    min="1"
                    max="20"
                    class="input-field"
                  />
                  <span class="input-unit">Steps</span>
                </div>
                <p class="input-hint">Maximale Anzahl Tool-Calls pro Turn</p>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </main>
  </div>

  <!-- Add Turn Modal -->
  {#if showAddTurnModal}
    <div class="modal-overlay" on:click={closeAddTurnModal}>
      <div class="modal-content" on:click|stopPropagation>
        <div class="modal-header">
          <h3 class="modal-title">Turn hinzufügen</h3>
          <button class="modal-close" on:click={closeAddTurnModal}>✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-description">
            {#if insertAfterIndex !== null}
              Turn wird nach "{formData.turns[insertAfterIndex]?.name || `Turn ${insertAfterIndex + 1}`}" eingefügt.
            {:else}
              Turn wird am Ende der Liste hinzugefügt.
            {/if}
          </p>
          <div class="modal-actions">
            <button
              on:click={closeAddTurnModal}
              class="btn-secondary"
            >
              Abbrechen
            </button>
            <button
              on:click={addTurnAtPosition}
              class="btn-primary"
            >
              Turn hinzufügen
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .agent-edit-view {
    @apply flex flex-col h-full bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950;
  }

  /* Header */
  .header {
    @apply border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm;
  }

  .header-content {
    @apply flex items-center justify-between px-8 py-6;
  }

  .title {
    @apply text-2xl font-bold text-white flex items-center gap-3 mb-1;
  }

  .icon {
    @apply text-3xl;
  }

  .subtitle {
    @apply text-sm text-neutral-400;
  }

  .header-actions {
    @apply flex items-center gap-3;
  }

  /* Main Content: Split View */
  .main-content {
    @apply flex flex-1 overflow-hidden;
  }

  /* Sidebar */
  .sidebar {
    @apply w-64 border-r border-neutral-800 bg-neutral-900/30 flex-shrink-0;
  }

  .sidebar-nav {
    @apply p-4 space-y-1;
  }

  .nav-item {
    @apply relative w-full px-4 py-3 rounded-lg transition-all text-left;
    @apply hover:bg-neutral-800/50;
  }

  .nav-item.active {
    @apply bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-600/30;
  }

  .nav-item-content {
    @apply flex items-center gap-3;
  }

  .nav-icon {
    @apply text-xl;
  }

  .nav-text {
    @apply flex-1 min-w-0;
  }

  .nav-label {
    @apply font-semibold text-white text-sm;
  }

  .nav-description {
    @apply text-xs text-neutral-400 truncate;
  }

  .nav-badge {
    @apply px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium;
  }

  .nav-indicator {
    @apply absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-r;
  }

  /* Content Area */
  .content-area {
    @apply flex-1 overflow-hidden;
  }

  .content-scroll {
    @apply h-full overflow-y-auto px-8 py-6 pb-12;
    scrollbar-width: thin;
    scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
  }

  .content-scroll::-webkit-scrollbar {
    width: 8px;
  }

  .content-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .content-scroll::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.3);
    border-radius: 4px;
  }

  .content-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.5);
  }

  /* Section Content */
  .section-content {
    @apply max-w-5xl mx-auto space-y-6 pb-12;
  }

  .section-header {
    @apply flex items-center justify-between mb-6;
  }

  .section-title {
    @apply text-2xl font-bold text-white mb-2;
  }

  .section-description {
    @apply text-sm text-neutral-400;
  }

  /* Buttons */
  .btn-primary {
    @apply px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg hover:shadow-blue-500/50;
  }

  .btn-secondary {
    @apply px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors;
  }

  .btn-danger-small {
    @apply px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2;
  }

  /* Config Cards */
  .config-grid {
    @apply grid grid-cols-2 gap-6;
  }

  .config-card {
    @apply bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 rounded-xl p-6;
  }

  .config-card-full {
    @apply bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 rounded-xl p-6;
  }

  .config-label {
    @apply block text-sm font-semibold text-neutral-300 mb-3;
  }

  /* Inputs */
  .input-large {
    @apply w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all;
  }

  .input-field {
    @apply w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500;
  }

  .input-number {
    @apply flex-1 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500;
  }

  .input-time {
    @apply w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500;
  }

  .input-cron {
    @apply w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500;
  }

  .select {
    @apply px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer;
  }

  .select-field {
    @apply w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer;
  }

  .textarea-large {
    @apply w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-y;
  }

  .system-prompt-textarea {
    @apply min-h-[400px] font-mono text-xs leading-relaxed;
  }

  .textarea-field {
    @apply w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none;
  }

  .turn-prompt-textarea {
    @apply min-h-[500px] resize-y font-mono text-xs leading-relaxed px-4 py-3;
  }

  .input-hint {
    @apply text-xs text-neutral-500 mt-2;
  }

  .field-hint {
    @apply text-xs text-neutral-500 mt-1;
  }

  .input-with-unit {
    @apply flex items-center gap-3;
  }

  .input-unit {
    @apply text-neutral-400 whitespace-nowrap;
  }

  /* Toggle Card */
  .toggle-card {
    @apply flex items-center gap-3 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg cursor-pointer hover:border-blue-500/50 transition-all;
  }

  .toggle-input {
    @apply w-6 h-6 rounded border-neutral-600 text-green-600 focus:ring-2 focus:ring-green-500/20;
  }

  .toggle-content {
    @apply flex-1;
  }

  .toggle-label {
    @apply font-semibold text-white;
  }

  .toggle-description {
    @apply text-xs text-neutral-400;
  }

  /* Model Selection */
  .model-grid {
    @apply grid grid-cols-2 gap-3;
  }

  .model-card {
    @apply flex flex-col gap-2 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg cursor-pointer transition-all hover:border-blue-500/50;
  }

  .model-card.selected {
    @apply border-blue-500 bg-blue-900/20;
  }

  .model-radio {
    @apply hidden;
  }

  .model-content {
    @apply flex-1;
  }

  .model-header {
    @apply flex items-center gap-2 mb-1;
  }

  .model-icon {
    @apply text-lg;
  }

  .model-name {
    @apply font-semibold text-white;
  }

  .model-notes {
    @apply text-xs text-neutral-400 mb-2;
  }

  .model-pricing {
    @apply ml-6 text-xs;
  }

  .pricing-text {
    @apply text-neutral-300 font-mono;
  }

  .pricing-estimate {
    @apply text-neutral-400 mt-1;
  }

  /* Schedule */
  .schedule-options {
    @apply flex gap-3 mb-4;
  }

  .schedule-btn {
    @apply flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2;
    @apply bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-700;
  }

  .schedule-btn.active {
    @apply bg-blue-600 text-white border-blue-500;
  }

  .schedule-inputs {
    @apply flex gap-3 mb-4;
  }

  .schedule-info {
    @apply bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300;
  }

  .schedule-info code {
    @apply font-mono text-blue-400;
  }

  /* Empty State */
  .empty-state {
    @apply bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-16 text-center;
  }

  .empty-icon {
    @apply text-6xl mb-4 opacity-30;
  }

  .empty-title {
    @apply text-xl text-neutral-400 mb-2;
  }

  .empty-description {
    @apply text-neutral-500 mb-6;
  }

  /* Turns */
  .turns-list {
    @apply space-y-4;
  }

  .turn-card {
    @apply bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border-2 border-neutral-700/50 rounded-xl p-6 hover:border-blue-500/30 transition-all;
  }

  .turn-header {
    @apply flex items-start justify-between mb-5;
  }

  .turn-left {
    @apply flex items-start gap-3 flex-1;
  }

  .turn-actions {
    @apply flex items-center gap-2 flex-shrink-0;
  }

  .turn-reorder {
    @apply flex flex-col gap-1;
  }

  .btn-reorder {
    @apply px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-white text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed;
  }

  .btn-reorder:not(.disabled):hover {
    @apply bg-blue-600 border-blue-500;
  }

  .btn-add-after {
    @apply px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-700/50 rounded text-sm font-medium transition-all;
  }

  .turn-number {
    @apply w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white mr-3;
  }

  .turn-info {
    @apply flex-1;
  }

  .turn-name-input {
    @apply w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-lg font-bold focus:outline-none focus:border-blue-500 mb-1;
  }

  .turn-meta {
    @apply text-xs text-neutral-400;
  }

  .turn-fields {
    @apply grid grid-cols-3 gap-4 mb-4;
  }

  .turn-field {
    @apply flex flex-col;
  }

  .field-label {
    @apply block text-xs font-semibold text-neutral-400 mb-2;
  }

  .turn-prompt {
    @apply mb-0;
  }

  /* Turn Selector */
  .turn-selector-section {
    @apply mb-6;
  }

  .turn-selector {
    @apply flex flex-wrap gap-2 mt-3;
  }

  .turn-selector-btn {
    @apply flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all;
    @apply bg-neutral-900 text-neutral-400 border border-neutral-700 hover:border-blue-500/50;
  }

  .turn-selector-btn.active {
    @apply bg-blue-600 text-white border-blue-500;
  }

  .turn-selector-number {
    @apply w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold;
  }

  .turn-selector-btn.active .turn-selector-number {
    @apply bg-white text-blue-600;
  }

  .turn-selector-name {
    @apply text-sm;
  }

  /* Tool Selection */
  .tool-selection-section {
    @apply mt-6;
  }

  .tool-mode-toggle {
    @apply mb-6;
  }

  .toggle-group {
    @apply flex gap-2 mt-3;
  }

  .tool-selector-container {
    @apply w-full mt-4;
  }

  .tool-selector-container :global(.tool-selector-modern) {
    @apply w-full;
  }

  .tool-selector-container :global(.tools-content) {
    @apply max-h-[700px];
  }

  .toggle-btn {
    @apply px-4 py-2 text-sm rounded-lg transition-colors;
    @apply bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700;
  }

  .toggle-btn.active {
    @apply bg-blue-600/20 text-blue-400 border-blue-600/50;
  }

  .mcp-selection {
    @apply mt-4;
  }

  .mcp-grid {
    @apply grid grid-cols-3 gap-3;
  }

  .mcp-card {
    @apply flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all border border-neutral-700;
    @apply bg-neutral-900 text-neutral-400 hover:bg-neutral-800;
  }

  .mcp-card.selected {
    @apply bg-blue-600 text-white border-blue-500;
  }

  .mcp-checkbox {
    @apply w-4 h-4 cursor-pointer;
  }

  .mcp-label {
    @apply text-sm font-medium;
  }

  .mcp-hint {
    @apply mt-4 text-xs text-neutral-500 bg-neutral-900 border border-neutral-700 rounded-lg p-3;
  }

  /* Rules */
  .rules-selection {
    @apply mt-6;
  }

  .rules-grid {
    @apply grid grid-cols-2 gap-3;
  }

  .rule-card-wrapper {
    @apply relative;
  }

  .rule-card {
    @apply flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all border border-neutral-700;
    @apply bg-neutral-900 text-neutral-400 hover:bg-neutral-800;
  }

  .rule-card.selected {
    @apply bg-blue-600 text-white border-blue-500;
  }

  .rule-checkbox {
    @apply w-4 h-4 cursor-pointer;
  }

  .rule-content {
    @apply flex items-center justify-between flex-1;
  }

  .rule-name {
    @apply text-sm font-medium;
  }

  .rule-checkmark {
    @apply text-xs text-blue-400;
  }

  .rule-tooltip {
    @apply absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-700/80 rounded-xl shadow-2xl z-50 pointer-events-none;
    @apply min-w-[400px] max-w-xl;
  }

  .tooltip-header {
    @apply text-neutral-300 font-semibold mb-3 text-sm flex items-center gap-2;
  }

  .tooltip-content {
    @apply text-neutral-200 text-sm leading-relaxed font-light whitespace-pre-wrap break-words;
  }

  .tooltip-arrow {
    @apply absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-neutral-900;
  }

  .rules-active {
    @apply mt-4 text-xs text-neutral-500 bg-neutral-900 border border-neutral-700 rounded-lg p-3;
  }

  .loading-state {
    @apply text-center py-4 text-neutral-400 text-sm;
  }

  /* Modal */
  .modal-overlay {
    @apply fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4;
  }

  .modal-content {
    @apply bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-700 rounded-xl shadow-2xl max-w-md w-full;
  }

  .modal-header {
    @apply flex items-center justify-between px-6 py-4 border-b border-neutral-800;
  }

  .modal-title {
    @apply text-lg font-bold text-white;
  }

  .modal-close {
    @apply w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer;
  }

  .modal-body {
    @apply px-6 py-4;
  }

  .modal-description {
    @apply text-neutral-300 mb-4;
  }

  .modal-actions {
    @apply flex items-center justify-end gap-3;
  }
</style>


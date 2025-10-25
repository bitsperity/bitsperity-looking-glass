<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let agent: any = null;
  export let isOpen = false;
  export let availableRules: any[] = [];  // List of available rules
  
  const dispatch = createEventDispatcher();
  
  let activeTab: 'basic' | 'turns' | 'advanced' = 'basic';
  
  // Available MCPs
  const availableMCPs = ['satbase', 'tesseract', 'manifold', 'ariadne'];
  
  // Schedule options
  let scheduleType: 'manual' | 'interval' | 'scheduled' | 'cron' = 'manual';
  let intervalValue = 60;
  let intervalUnit: 'minutes' | 'hours' = 'minutes';
  let scheduledTime = '09:00';
  let customCron = '0 * * * *';
  
  // Form state
  let formData = {
    name: '',
    enabled: true,
    model: 'haiku-3.5',
    schedule: 'manual',
    timeout_minutes: 10,
    budget_daily_tokens: 5000,
    system_prompt: '',
    rules: '',
    turns: [] as any[]
  };
  
  // Tooltip state
  let hoveredRuleId: string | null = null;
  
  function initializeFormData() {
    if (!agent || !isOpen) return;
    
    // Load rules from either 'rules' field or 'rules_file' field
    let rulesContent = agent.config?.rules || '';
    if (!rulesContent && agent.config?.rules_file) {
      rulesContent = `# Rules laden aus: ${agent.config.rules_file}\n\n(Rules werden aus File geladen - hier kannst du sie direkt bearbeiten)`;
    }
    
    formData = {
      name: agent.name || '',
      enabled: agent.config?.enabled ?? true,
      model: agent.config?.model || 'haiku-3.5',
      schedule: agent.config?.schedule || 'manual',
      timeout_minutes: agent.config?.timeout_minutes || 10,
      budget_daily_tokens: agent.config?.budget_daily_tokens || 5000,
      system_prompt: agent.config?.system_prompt || '',
      rules: rulesContent,
      turns: (agent.config?.turns || []).map((turn: any) => ({
        ...turn,
        mcps: turn.mcps || [],
        rules: turn.rules || [] // Assuming rules are part of the turn config
      }))
    };
    parseSchedule(formData.schedule);
  }
  
  function initializeNewAgent() {
    if (agent || !isOpen) return;
    
    // Reset form for new agent
    formData = {
      name: '',
      enabled: true,
      model: 'haiku-3.5',
      schedule: 'manual',
      timeout_minutes: 10,
      budget_daily_tokens: 5000,
      system_prompt: '',
      rules: '',
      turns: []
    };
    scheduleType = 'manual';
  }
  
  // Reactive statement that triggers when agent, isOpen, or both change
  $: if (isOpen) {
    if (agent) {
      initializeFormData();
    } else {
      initializeNewAgent();
    }
  }
  
  // Also initialize immediately when component first receives agent
  $: agent, initializeFormData();
  
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
      scheduleType = 'cron' as 'manual' | 'interval' | 'scheduled' | 'cron';
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
  
  function close() {
    dispatch('close');
  }
  
  function save() {
    formData.schedule = buildSchedule();
    dispatch('save', formData);
  }
  
  function addTurn() {
    formData.turns = [
      ...formData.turns,
      {
        id: formData.turns.length + 1,
        name: '',
        model: formData.model,
        max_tokens: 1500,
        mcps: [],
        prompt: '',
        rules: [] // Initialize rules for new turns
      }
    ];
  }
  
  function removeTurn(index: number) {
    formData.turns = formData.turns.filter((_, i) => i !== index);
    formData = { ...formData };
  }
  
  // REACTIVE: Re-evaluate turn display when formData changes
  $: turnsForDisplay = formData.turns;
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6" on:click={close}>
    <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border-2 border-neutral-700 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" on:click|stopPropagation>
      <!-- Header -->
      <div class="flex items-center justify-between px-8 py-6 border-b border-neutral-700">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center gap-3">
            <span class="text-3xl">⚙️</span>
            {agent ? agent.name : 'Neuer Agent'}
          </h2>
          <p class="text-sm text-neutral-400 mt-1">
            {agent ? 'Agent konfigurieren und bearbeiten' : 'Erstelle einen neuen Orchestrator-Agent'}
          </p>
        </div>
        <button
          on:click={close}
          class="text-neutral-400 hover:text-white text-2xl transition-colors"
        >
          ✕
        </button>
      </div>
      
      <!-- Tabs -->
      <div class="flex border-b border-neutral-700 px-8">
        <button
          on:click={() => activeTab = 'basic'}
          class={`px-6 py-4 font-medium transition-all relative ${
            activeTab === 'basic'
              ? 'text-blue-400'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span class="flex items-center gap-2">
            <span>⚡</span>
            Basis
          </span>
          {#if activeTab === 'basic'}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          {/if}
        </button>
        <button
          on:click={() => activeTab = 'turns'}
          class={`px-6 py-4 font-medium transition-all relative ${
            activeTab === 'turns'
              ? 'text-blue-400'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span class="flex items-center gap-2">
            <span>🔄</span>
            Turns
            {#if formData.turns.length > 0}
              <span class="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">{formData.turns.length}</span>
            {/if}
          </span>
          {#if activeTab === 'turns'}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          {/if}
        </button>
        <button
          on:click={() => activeTab = 'advanced'}
          class={`px-6 py-4 font-medium transition-all relative ${
            activeTab === 'advanced'
              ? 'text-blue-400'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span class="flex items-center gap-2">
            <span>🔧</span>
            Erweitert
          </span>
          {#if activeTab === 'advanced'}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          {/if}
        </button>
      </div>
      
      <!-- Form Content -->
      <div class="flex-1 overflow-y-auto px-8 py-6">
        {#if activeTab === 'basic'}
          <div class="space-y-6 max-w-3xl">
            <!-- Name & Status -->
            <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-6">
              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-neutral-300 mb-3">Agent Name</label>
                  <input
                    type="text"
                    bind:value={formData.name}
                    placeholder="z.B. discovery, analyst_tech"
                    class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    disabled={!!agent}
                  />
                  {#if agent}
                    <p class="text-xs text-neutral-500 mt-2">Name kann nachträglich nicht geändert werden</p>
                  {/if}
                </div>
                
                <div>
                  <label class="block text-sm font-semibold text-neutral-300 mb-3">Status</label>
                  <label class="flex items-center gap-3 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg cursor-pointer hover:border-blue-500/50 transition-all">
                    <input
                      type="checkbox"
                      bind:checked={formData.enabled}
                      class="w-6 h-6 rounded border-neutral-600 text-green-600 focus:ring-2 focus:ring-green-500/20"
                    />
                    <div class="flex-1">
                      <div class="font-semibold text-white">{formData.enabled ? 'Aktiviert' : 'Deaktiviert'}</div>
                      <div class="text-xs text-neutral-400">Agent ist {formData.enabled ? 'aktiv und läuft automatisch' : 'inaktiv'}</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Model Selection -->
            <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-6">
              <label class="block text-sm font-semibold text-neutral-300 mb-3">KI Model</label>
              <div class="grid grid-cols-2 gap-3">
                {#each [
                  { value: 'haiku-3.5', label: 'Haiku 3.5', desc: 'Schnell & günstig', icon: '⚡' },
                  { value: 'haiku-4.5', label: 'Haiku 4.5', desc: 'Verbessert & schnell', icon: '🚀' },
                  { value: 'sonnet-4.5', label: 'Sonnet 4.5', desc: 'Balanced Performance', icon: '🎯' },
                  { value: 'opus-4.1', label: 'Opus 4.1', desc: 'Höchste Qualität', icon: '💎' }
                ] as model}
                  <label class="flex items-center gap-3 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg cursor-pointer hover:border-blue-500/50 transition-all {formData.model === model.value ? 'border-blue-500 bg-blue-900/20' : ''}">
                    <input
                      type="radio"
                      bind:group={formData.model}
                      value={model.value}
                      class="w-4 h-4"
                    />
                    <div class="flex-1">
                      <div class="font-semibold text-white flex items-center gap-2">
                        <span>{model.icon}</span>
                        {model.label}
                      </div>
                      <div class="text-xs text-neutral-400">{model.desc}</div>
                    </div>
                  </label>
                {/each}
              </div>
            </div>

            <!-- Schedule -->
            <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-6">
              <label class="block text-sm font-semibold text-neutral-300 mb-3">Schedule / Ausführung</label>
              <div class="space-y-4">
                <div class="flex gap-3">
                  {#each [
                    { value: 'manual', label: 'Manuell', icon: '✋' },
                    { value: 'interval', label: 'Intervall', icon: '⏱️' },
                    { value: 'scheduled', label: 'Geplant', icon: '📅' },
                    { value: 'cron', label: 'Cron', icon: '⚙️' }
                  ] as type}
                    <button
                      on:click={() => scheduleType = type.value}
                      class="flex-1 px-4 py-3 rounded-lg font-medium transition-all {scheduleType === type.value ? 'bg-blue-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-700'}"
                    >
                      <span class="mr-2">{type.icon}</span>
                      {type.label}
                    </button>
                  {/each}
                </div>
                
                {#if scheduleType === 'manual'}
                  <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300">
                    ℹ️ Agent wird nur manuell über den "Run"-Button gestartet
                  </div>
                {:else if scheduleType === 'interval'}
                  <div class="flex gap-3">
                    <input
                      type="number"
                      bind:value={intervalValue}
                      min="1"
                      class="flex-1 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="60"
                    />
                    <select
                      bind:value={intervalUnit}
                      class="px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="minutes">Minuten</option>
                      <option value="hours">Stunden</option>
                    </select>
                  </div>
                  <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300">
                    ⏱️ Agent läuft alle {intervalValue} {intervalUnit === 'hours' ? 'Stunden' : 'Minuten'}
                  </div>
                {:else if scheduleType === 'scheduled'}
                  <input
                    type="time"
                    bind:value={scheduledTime}
                    class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300">
                    📅 Agent läuft täglich um {scheduledTime} Uhr
                  </div>
                {:else}
                  <input
                    type="text"
                    bind:value={customCron}
                    placeholder="0 * * * *"
                    class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300">
                    ⚙️ Cron Expression: <code class="font-mono text-blue-400">{customCron}</code>
                  </div>
                {/if}
              </div>
            </div>

            <!-- System Prompt -->
            <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-6">
              <label class="block text-sm font-semibold text-neutral-300 mb-3">System Prompt</label>
              <textarea
                bind:value={formData.system_prompt}
                rows={6}
                placeholder="System-Anweisungen für den Agent...

Beispiel:
Du bist ein Agent, der Märkte analysiert. Deine Aufgabe ist es, Signale zu finden und in Thoughts zu speichern."
                class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
        {:else if activeTab === 'turns'}
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-bold text-white">Turn-Konfiguration</h3>
                <p class="text-sm text-neutral-400 mt-1">Definiere die Schritte, die der Agent ausführen soll</p>
              </div>
              <button
                on:click={addTurn}
                class="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <span class="text-lg">➕</span>
                Turn hinzufügen
              </button>
            </div>
            
            {#if formData.turns.length === 0}
              <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-16 text-center">
                <div class="text-6xl mb-4 opacity-30">🔄</div>
                <div class="text-xl text-neutral-400 mb-2">Noch keine Turns definiert</div>
                <p class="text-neutral-500 mb-6">Erstelle Turns, um den Agent-Workflow zu definieren</p>
                <button
                  on:click={addTurn}
                  class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                >
                  <span>➕</span>
                  Ersten Turn erstellen
                </button>
              </div>
            {:else}
              <div class="space-y-4">
                {#each formData.turns as turn, i (turn.name + i)}
                  <div class="bg-neutral-900/30 border-2 border-neutral-700/50 rounded-xl p-6 hover:border-blue-500/30 transition-all">
                    <div class="flex items-start justify-between mb-5">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
                          {i + 1}
                        </div>
                        <div>
                          <h4 class="text-lg font-bold text-white">{turn.name || `Turn ${i + 1}`}</h4>
                          <p class="text-xs text-neutral-400">Max {turn.max_tokens || 1500} Tokens</p>
                        </div>
                      </div>
                      <button
                        on:click={() => removeTurn(i)}
                        class="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <span>🗑️</span>
                        Löschen
                      </button>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label class="block text-xs font-semibold text-neutral-400 mb-2">Turn Name</label>
                        <input
                          type="text"
                          bind:value={turn.name}
                          placeholder="z.B. load_data, analyze, synthesize"
                          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-neutral-400 mb-2">Max Tokens</label>
                        <input
                          type="number"
                          bind:value={turn.max_tokens}
                          min="100"
                          max="8000"
                          step="100"
                          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <!-- Model Selection per Turn -->
                    <div class="mb-4">
                      <label class="block text-xs font-semibold text-neutral-400 mb-2">Model (für diesen Turn)</label>
                      <select
                        bind:value={turn.model}
                        class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="haiku-3.5">⚡ Haiku 3.5 (Schnell & günstig)</option>
                        <option value="haiku-4.5">🚀 Haiku 4.5 (Verbessert & schnell)</option>
                        <option value="sonnet-4.5">🎯 Sonnet 4.5 (Balanced)</option>
                        <option value="opus-4.1">💎 Opus 4.1 (Höchste Qualität)</option>
                      </select>
                      <p class="text-xs text-neutral-500 mt-1">Überschreibt das Agent-Standard-Model für diesen Turn</p>
                    </div>

                    <!-- MCP Selection -->
                    <div class="mb-4">
                      <label class="block text-xs font-semibold text-neutral-400 mb-2">MCPs (Multi-Channel Protocols)</label>
                      <div class="flex flex-wrap gap-2">
                        {#each availableMCPs as mcp}
                          <label class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all {(formData.turns[i]?.mcps || []).includes(mcp) ? 'bg-blue-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-700'}">
                            <input
                              type="checkbox"
                              checked={(formData.turns[i]?.mcps || []).includes(mcp)}
                              on:change={(e) => {
                                const isChecked = e.currentTarget.checked;
                                const mcps = formData.turns[i].mcps || [];
                                if (isChecked && !mcps.includes(mcp)) {
                                  formData.turns[i].mcps = [...mcps, mcp];
                                } else if (!isChecked && mcps.includes(mcp)) {
                                  formData.turns[i].mcps = mcps.filter(m => m !== mcp);
                                }
                                formData.turns = [...formData.turns];
                              }}
                              class="w-4 h-4 cursor-pointer"
                            />
                            <span class="text-sm font-medium">{mcp}</span>
                          </label>
                        {/each}
                      </div>
                      {#if formData.turns[i]?.mcps?.length > 0}
                        <div class="mt-2 text-xs text-neutral-500">
                          Aktiv: {formData.turns[i].mcps.join(', ')}
                        </div>
                      {/if}
                    </div>

                    <!-- Rules Selection -->
                    <div class="mb-4">
                      <label class="block text-xs font-semibold text-neutral-400 mb-2">Regeln (für diesen Turn)</label>
                      <div class="flex flex-wrap gap-2">
                        {#each availableRules as rule (rule.id)}
                          <div class="relative group">
                            <label 
                              class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all {(formData.turns[i]?.rules || []).includes(rule.id) ? 'bg-blue-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-700'}"
                              on:mouseenter={() => hoveredRuleId = rule.id}
                              on:mouseleave={() => hoveredRuleId = null}
                            >
                              <input
                                type="checkbox"
                                checked={(formData.turns[i]?.rules || []).includes(rule.id)}
                                on:change={(e) => {
                                  const isChecked = e.currentTarget.checked;
                                  const rules = formData.turns[i].rules || [];
                                  if (isChecked && !rules.includes(rule.id)) {
                                    formData.turns[i].rules = [...rules, rule.id];
                                  } else if (!isChecked && rules.includes(rule.id)) {
                                    formData.turns[i].rules = rules.filter(r => r !== rule.id);
                                  }
                                  formData.turns = [...formData.turns];
                                }}
                                class="w-4 h-4 cursor-pointer"
                              />
                              <span class="text-sm font-medium">{rule.name}</span>
                            </label>
                            
                            <!-- Tooltip with Rule Content - Elegant Coalescence Style -->
                            {#if hoveredRuleId === rule.id && rule.content}
                              <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-700/80 rounded-xl shadow-2xl z-50 pointer-events-none">
                                <div class="text-neutral-300 font-semibold mb-3 text-sm flex items-center gap-2">
                                  <span>📋</span>
                                  <span>Regel-Inhalt</span>
                                </div>
                                <div class="text-neutral-200 text-sm leading-relaxed font-light whitespace-pre-wrap break-words max-w-xl">
                                  {rule.content}
                                </div>
                                <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-neutral-900"></div>
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </div>
                      {#if formData.turns[i]?.rules?.length > 0}
                        <div class="mt-2 text-xs text-neutral-500">
                          Aktiv: {formData.turns[i].rules.map(ruleId => {
                            const rule = availableRules.find(r => r.id === ruleId);
                            return rule?.name || ruleId;
                          }).join(', ')}
                        </div>
                      {/if}
                    </div>
                    
                    <div>
                      <label class="block text-xs font-semibold text-neutral-400 mb-2">Prompt</label>
                      <textarea
                        bind:value={turn.prompt}
                        rows={3}
                        placeholder="Was soll in diesem Turn passieren?

Beispiel:
Lade die Watchlist und prüfe welche Tickers heute relevant sind..."
                        class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <div class="space-y-6 max-w-3xl">
            <div>
              <h3 class="text-lg font-bold text-white mb-2">Erweiterte Einstellungen</h3>
              <p class="text-sm text-neutral-400">Optionale Konfiguration für Power-User</p>
            </div>

            <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-6">
              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-neutral-300 mb-3">Timeout</label>
                  <div class="flex items-center gap-3">
                    <input
                      type="number"
                      bind:value={formData.timeout_minutes}
                      min="1"
                      max="60"
                      class="flex-1 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    <span class="text-neutral-400">Minuten</span>
                  </div>
                  <p class="text-xs text-neutral-500 mt-2">Maximale Laufzeit pro Run</p>
                </div>
                
                <div>
                  <label class="block text-sm font-semibold text-neutral-300 mb-3">Token Budget (täglich)</label>
                  <div class="flex items-center gap-3">
                    <input
                      type="number"
                      bind:value={formData.budget_daily_tokens}
                      min="1000"
                      step="1000"
                      class="flex-1 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    <span class="text-neutral-400">Tokens</span>
                  </div>
                  <p class="text-xs text-neutral-500 mt-2">Budget-Limit pro Tag</p>
                </div>
              </div>
            </div>

            <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-6">
              <label class="block text-sm font-semibold text-neutral-300 mb-3">Agent Rules (Markdown)</label>
              <textarea
                bind:value={formData.rules}
                rows={12}
                placeholder="# Agent Rules

Definiere hier die Regeln und Richtlinien für den Agent in Markdown-Format.

## Aufgaben
- Task 1
- Task 2

## Constraints
- Constraint 1
- Constraint 2"
                class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <p class="text-xs text-neutral-500 mt-2">💡 Markdown-formatierte Regeln, die zusätzlich zum System Prompt geladen werden</p>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Footer -->
      <div class="flex items-center justify-between px-8 py-6 border-t border-neutral-700 bg-neutral-900/50">
        <div class="text-sm text-neutral-400">
          {#if activeTab === 'basic'}
            Schritt 1 von 3: Basis-Konfiguration
          {:else if activeTab === 'turns'}
            Schritt 2 von 3: {formData.turns.length} Turn{formData.turns.length !== 1 ? 's' : ''} definiert
          {:else}
            Schritt 3 von 3: Erweiterte Optionen
          {/if}
        </div>
        <div class="flex items-center gap-3">
          <button
            on:click={close}
            class="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors"
          >
            Abbrechen
          </button>
          <button
            on:click={save}
            class="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg font-medium shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-2"
          >
            <span>💾</span>
            Speichern
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}


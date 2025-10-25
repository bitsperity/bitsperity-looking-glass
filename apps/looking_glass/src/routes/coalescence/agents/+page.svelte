<script lang="ts">
  import { onMount } from 'svelte';
  import { coalescenceClient } from '$lib/coalescence-client';
  import AgentModal from '$lib/components/coalescence/AgentModal.svelte';

  let agents: any[] = [];
  let agentStats: any[] = [];
  let availableRules: any[] = [];  // Add available rules
  let loading = true;
  let error: string | null = null;
  let successMessage = '';
  let viewMode: 'cards' | 'yaml' = 'cards';
  let yamlContent = '';
  let parsedConfig: any = null;
  let showModal = false;
  let selectedAgent: any = null;

  async function loadData() {
    try {
      const prevAgents = agents;
      loading = true;
      error = null;
      
      // Load config, stats, and rules in parallel
      const [config, stats, rules] = await Promise.all([
        coalescenceClient.getConfigAgents(),
        coalescenceClient.getAgents(),
        coalescenceClient.getAllRules()
      ]);
      
      yamlContent = config.content;
      parsedConfig = config.parsed;
      agentStats = stats.agents || [];
      availableRules = rules || [];  // Store available rules
      
      // Parse agents from YAML
      if (parsedConfig?.agents) {
        agents = Object.entries(parsedConfig.agents).map(([name, config]: [string, any]) => {
          const stat = agentStats.find(s => s.name === name);
          return {
            name,
            config,
            stats: stat
          };
        });
      }
      
      // Only show loading state if this is the first load
      if (prevAgents.length === 0) {
        loading = false;
      } else {
        // Silently update without flicker
        loading = false;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load agents';
      loading = false;
    }
  }

  async function saveAgent(event: CustomEvent) {
    const formData = event.detail;
    try {
      error = null;
      
      // Update the parsed config
      if (!parsedConfig.agents) {
        parsedConfig.agents = {};
      }
      
      const agentConfig: any = {
        enabled: formData.enabled,
        schedule: formData.schedule,
        model: formData.model,
        timeout_minutes: formData.timeout_minutes,
        budget_daily_tokens: formData.budget_daily_tokens,
        system_prompt: formData.system_prompt,
        turns: formData.turns.map((turn: any) => {
          const turnConfig: any = {
            id: turn.id || formData.turns.indexOf(turn) + 1,
            name: turn.name || '',
            max_tokens: turn.max_tokens || 1500,
            mcps: turn.mcps || [],
            prompt: turn.prompt || ''
          };
          
          // Only include model if it's different from agent-level model
          if (turn.model && turn.model !== formData.model) {
            turnConfig.model = turn.model;
          }

          // Include rules if specified for this turn
            turnConfig.rules = turn.rules;
          }
          
          return turnConfig;
        })
      };
      
      
      parsedConfig.agents[formData.name] = agentConfig;
      
      // Convert back to YAML using simple serialization
      // We'll let the backend handle the YAML formatting
      await coalescenceClient.saveConfigAgents(JSON.stringify(parsedConfig));
      
      successMessage = '✅ Agent gespeichert';
      setTimeout(() => {
        successMessage = '';
      }, 3000);
      
      showModal = false;
      await loadData();
      
      // Refresh selectedAgent with the newly loaded data so changes persist when reopening
      selectedAgent = agents.find(a => a.name === formData.name) || null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save agent';
    }
  }

  function editAgent(agent: any) {
    selectedAgent = agent;
    showModal = true;
  }

  function createNewAgent() {
    selectedAgent = null;
    showModal = true;
  }

  async function toggleAgent(agentName: string, enabled: boolean) {
    try {
      parsedConfig.agents[agentName].enabled = enabled;
      // Use the original YAML and just replace the enabled field
      const lines = yamlContent.split('\n');
      let inAgent = false;
      let newLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === `${agentName}:`) {
          inAgent = true;
          newLines.push(line);
        } else if (inAgent && line.includes('enabled:')) {
          newLines.push(line.replace(/enabled:.*/, `enabled: ${enabled}`));
          inAgent = false;
        } else {
          newLines.push(line);
        }
      }
      
      await coalescenceClient.saveConfigAgents(newLines.join('\n'));
      await loadData();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to toggle agent';
    }
  }

  onMount(() => {
    loadData();
    // Auto-refresh every 10 seconds (silently in background)
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  });
</script>

<div class="flex-1 overflow-auto px-8 pb-8">
  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white flex items-center gap-3 mb-2">
        <span class="text-4xl">⚙️</span>
        Agents
      </h1>
      <p class="text-neutral-400">Verwalte und konfiguriere deine Orchestrator-Agents</p>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex bg-neutral-800 border border-neutral-700 rounded-lg p-1">
        <button
          on:click={() => viewMode = 'cards'}
          class={`px-4 py-2 rounded text-sm font-medium transition-all ${
            viewMode === 'cards'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          📊 Karten
        </button>
        <button
          on:click={() => viewMode = 'yaml'}
          class={`px-4 py-2 rounded text-sm font-medium transition-all ${
            viewMode === 'yaml'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          📝 YAML
        </button>
      </div>
      <button
        on:click={createNewAgent}
        class="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all font-medium flex items-center gap-2"
      >
        <span class="text-lg">➕</span>
        Neuer Agent
      </button>
    </div>
  </div>

  <!-- Messages -->
  {#if successMessage}
    <div class="bg-gradient-to-r from-green-900/40 to-green-800/30 border-2 border-green-600/50 rounded-xl p-5 mb-6 text-green-300 shadow-lg shadow-green-900/30 flex items-center gap-3">
      <span class="text-2xl">✅</span>
      <div>{successMessage}</div>
    </div>
  {/if}
  {#if error}
    <div class="bg-gradient-to-r from-red-900/40 to-red-800/30 border-2 border-red-600/50 rounded-xl p-5 mb-6 text-red-300 shadow-lg shadow-red-900/30 flex items-center gap-3">
      <span class="text-2xl">⚠️</span>
      <div>{error}</div>
    </div>
  {/if}

  {#if loading && agents.length === 0}
    <div class="flex items-center justify-center h-96">
      <div class="text-center">
        <div class="inline-block animate-spin text-5xl mb-4">⚙️</div>
        <div class="text-xl text-neutral-400 font-medium">Agents werden geladen...</div>
      </div>
    </div>
  {:else if viewMode === 'cards'}
    <!-- Cards View -->
    {#if agents.length === 0}
      <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-16 text-center">
        <div class="text-6xl mb-4 opacity-30">🤖</div>
        <div class="text-2xl text-neutral-400 mb-4">Keine Agents konfiguriert</div>
        <button
          on:click={createNewAgent}
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          <span>➕</span>
          Ersten Agent erstellen
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-3 gap-6">
        {#each agents as agent}
          <div class="group relative bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-500/50 hover:scale-[1.02] transition-all duration-300">
            <!-- Status Indicator -->
            <div class="absolute top-4 right-4 w-3 h-3 rounded-full {agent.config?.enabled ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' : 'bg-neutral-500'}" />
            
            <div class="mb-5">
              <h3 class="font-bold text-2xl mb-2 text-white group-hover:text-blue-400 transition-colors">{agent.name}</h3>
              <div class="inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full {agent.config?.enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-neutral-700 text-neutral-400 border border-neutral-600'}">
                <span class="w-1.5 h-1.5 rounded-full {agent.config?.enabled ? 'bg-green-400' : 'bg-neutral-400'}" />
                {agent.config?.enabled ? 'Aktiv' : 'Inaktiv'}
              </div>
            </div>

            <div class="space-y-3 mb-5">
              <div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Model</div>
                <div class="text-sm font-semibold text-white">{agent.config?.model || 'N/A'}</div>
              </div>
              
              <div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Schedule</div>
                <div class="text-xs font-mono text-white">{agent.config?.schedule || 'N/A'}</div>
              </div>
              
              <div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Turns</div>
                <div class="text-sm font-semibold text-blue-400">{agent.config?.turns?.length || 0}</div>
              </div>
              
              {#if agent.stats}
                <div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                  <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Total Runs</div>
                  <div class="text-sm font-semibold text-purple-400">{agent.stats.total_runs || 0}</div>
                </div>
              {/if}
            </div>

            <div class="flex gap-2">
              <button
                on:click={() => editAgent(agent)}
                class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>✏️</span>
                Bearbeiten
              </button>
              <button
                on:click={() => toggleAgent(agent.name, !agent.config?.enabled)}
                class="px-4 py-2 {agent.config?.enabled ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} rounded-lg text-sm font-medium transition-colors"
              >
                {agent.config?.enabled ? '⏸️' : '▶️'}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <!-- YAML View -->
    <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <span>📝</span>
          YAML Configuration
        </h3>
        <div class="text-xs text-neutral-500 font-mono">{yamlContent.split('\n').length} Zeilen</div>
      </div>
      <textarea
        bind:value={yamlContent}
        rows={25}
        class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg font-mono text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
      />
      <div class="flex gap-3 mt-4">
        <button
          on:click={async () => {
            try {
              await coalescenceClient.saveConfigAgents(yamlContent);
              successMessage = '✅ YAML gespeichert';
              setTimeout(() => { successMessage = ''; }, 3000);
              await loadData();
            } catch (e) {
              error = e instanceof Error ? e.message : 'Failed to save YAML';
            }
          }}
          class="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg font-medium shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-2"
        >
          <span>💾</span>
          Speichern
        </button>
        <button
          on:click={loadData}
          class="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>↺</span>
          Neu laden
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Modal -->
<AgentModal
  bind:isOpen={showModal}
  agent={selectedAgent}
  on:close={() => showModal = false}
  on:save={saveAgent}
  availableRules={availableRules}
/>


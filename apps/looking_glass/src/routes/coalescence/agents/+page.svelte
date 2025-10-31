<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { coalescenceClient, type AgentConfig } from '$lib/coalescence-client';
  import AgentModal from '$lib/components/coalescence/AgentModal.svelte';

  let agents: (AgentConfig & { stats?: any })[] = [];
  let agentStats: any[] = [];
  let availableRules: any[] = [];
  let loading = true;
  let error: string | null = null;
  let successMessage = '';
  let showModal = false;
  let selectedAgent: AgentConfig | null = null;

  async function loadData() {
    try {
      const prevAgents = agents;
      loading = true;
      error = null;
      
      // Load agents from new API, stats, and rules in parallel
      const [agentsResponse, stats, rules] = await Promise.all([
        coalescenceClient.listAgents(),
        coalescenceClient.getAgents(),
        coalescenceClient.getAllRules()
      ]);
      
      agentStats = stats.agents || [];
      availableRules = rules || [];
      
      // Merge agents with stats
      agents = agentsResponse.agents.map(agent => {
        const stat = agentStats.find((s: any) => s.name === agent.name);
        return {
          ...agent,
          stats: stat
        };
      });
      
      // Only show loading state if this is the first load
      if (prevAgents.length === 0) {
        loading = false;
      } else {
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
      successMessage = '';
      
      // Prepare agent config
      const agentConfig: Omit<AgentConfig, 'created_at' | 'updated_at'> = {
        name: formData.name,
        enabled: formData.enabled,
        model: formData.model,
        schedule: formData.schedule,
        system_prompt: formData.system_prompt || undefined,
        max_tokens_per_turn: formData.max_tokens_per_turn,
        max_steps: formData.max_steps || 5,
        budget_daily_tokens: formData.budget_daily_tokens,
        timeout_minutes: formData.timeout_minutes,
        turns: formData.turns.map((turn: any, index: number) => ({
          id: turn.id || index + 1,
          name: turn.name || `Turn ${index + 1}`,
          max_tokens: turn.max_tokens || 1500,
          max_steps: turn.max_steps,
          mcps: turn.mcps || [],
          prompt: turn.prompt || undefined,
          prompt_file: turn.prompt_file || undefined,
          model: turn.model && turn.model !== formData.model ? turn.model : undefined,
          rules: turn.rules || undefined
        }))
      };
      
      // Check if agent exists
      const existingAgent = agents.find(a => a.name === formData.name);
      
      if (existingAgent && selectedAgent && selectedAgent.name === formData.name) {
        // Update existing agent
        await coalescenceClient.updateAgent(formData.name, agentConfig);
        successMessage = `✅ Agent "${formData.name}" aktualisiert`;
        // Reload agents after update
        await coalescenceClient.reloadAgents();
      } else {
        // Create new agent
        await coalescenceClient.createAgent(agentConfig);
        successMessage = `✅ Agent "${formData.name}" erstellt`;
        // Reload agents after create
        await coalescenceClient.reloadAgents();
      }
      
      setTimeout(() => {
        successMessage = '';
      }, 3000);
      
      showModal = false;
      await loadData();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save agent';
    }
  }

  async function deleteAgent(agentName: string) {
    if (!confirm(`Agent "${agentName}" wirklich löschen?`)) return;
    
    try {
      error = null;
      await coalescenceClient.deleteAgent(agentName);
      successMessage = `✅ Agent "${agentName}" gelöscht`;
      setTimeout(() => { successMessage = ''; }, 3000);
      await loadData();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to delete agent';
    }
  }

  async function editAgent(agent: AgentConfig) {
    try {
      error = null;
      // Load full agent config from API
      const fullAgent = await coalescenceClient.getAgent(agent.name);
      selectedAgent = fullAgent;
      showModal = true;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load agent details';
      // Fallback to list agent if API fails
      selectedAgent = agent;
      showModal = true;
    }
  }

  function createNewAgent() {
    selectedAgent = null;
    showModal = true;
  }

  async function toggleAgent(agentName: string, enabled: boolean) {
    try {
      error = null;
      await coalescenceClient.updateAgent(agentName, { enabled });
      await coalescenceClient.reloadAgents();
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
      <button
        on:click={async () => {
          try {
            error = null;
            await coalescenceClient.reloadAgents();
            successMessage = '✅ Agents neu geladen';
            setTimeout(() => { successMessage = ''; }, 3000);
            await loadData();
          } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to reload agents';
          }
        }}
        class="px-4 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors flex items-center gap-2"
        title="Agent-Konfigurationen neu laden"
      >
        <span>🔄</span>
        Reload
      </button>
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
  {:else if agents.length === 0}
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
    <!-- Agents Grid -->
    <div class="grid grid-cols-3 gap-6">
      {#each agents as agent}
        <div class="group relative bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-500/50 hover:scale-[1.02] transition-all duration-300">
          <!-- Status Indicator -->
          <div class="absolute top-4 right-4 w-3 h-3 rounded-full {agent.enabled ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' : 'bg-neutral-500'}" />
          
          <div class="mb-5">
            <h3 class="font-bold text-2xl mb-2 text-white group-hover:text-blue-400 transition-colors">{agent.name}</h3>
            <div class="inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full {agent.enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-neutral-700 text-neutral-400 border border-neutral-600'}">
              <span class="w-1.5 h-1.5 rounded-full {agent.enabled ? 'bg-green-400' : 'bg-neutral-400'}" />
              {agent.enabled ? 'Aktiv' : 'Inaktiv'}
            </div>
          </div>

          <div class="space-y-3 mb-5">
            <div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
              <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Model</div>
              <div class="text-sm font-semibold text-white">{agent.model || 'N/A'}</div>
            </div>
            
            <div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
              <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Schedule</div>
              <div class="text-xs font-mono text-white">{agent.schedule || 'N/A'}</div>
            </div>
            
            <div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
              <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Turns</div>
              <div class="text-sm font-semibold text-blue-400">{agent.turns?.length || 0}</div>
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
              on:click={() => goto(`/coalescence/agents/${agent.name}`)}
              class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              title="Details anzeigen"
            >
              <span>👁️</span>
              Details
            </button>
            <button
              on:click={() => editAgent(agent)}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              title="Bearbeiten"
            >
              <span>✏️</span>
            </button>
            <button
              on:click={() => toggleAgent(agent.name, !agent.enabled)}
              class="px-4 py-2 {agent.enabled ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} rounded-lg text-sm font-medium transition-colors"
              title={agent.enabled ? 'Deaktivieren' : 'Aktivieren'}
            >
              {agent.enabled ? '⏸️' : '▶️'}
            </button>
            <button
              on:click={() => deleteAgent(agent.name)}
              class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
              title="Löschen"
            >
              🗑️
            </button>
          </div>
        </div>
      {/each}
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

<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { coalescenceClient } from '$lib/coalescence-client';
  import AgentEditView from '$lib/components/coalescence/AgentEditView.svelte';

  let agent: any = null;
  let availableRules: any[] = [];
  let loading = true;
  let error: string | null = null;
  let saving = false;

  const agentName = $page.params.name;
  const isNew = agentName === 'new';

  async function loadData() {
    try {
      loading = true;
      error = null;

      // Load rules
      availableRules = await coalescenceClient.getAllRules();

      // Load agent if editing existing
      if (!isNew) {
        try {
          agent = await coalescenceClient.getAgent(agentName);
          // Ensure name is set (API might return 'agent' instead of 'name')
          if (!agent.name && agent.agent) {
            agent.name = agent.agent;
          }
        } catch (e: any) {
          error = `Failed to load agent: ${e.message}`;
          console.error('Error loading agent:', e);
        }
      }
    } catch (e: any) {
      error = e instanceof Error ? e.message : 'Failed to load data';
      console.error('Error loading data:', e);
    } finally {
      loading = false;
    }
  }

  async function handleSave(event: CustomEvent) {
    const formData = event.detail;
    try {
      saving = true;
      error = null;
      
      // Validate name
      if (!formData.name || formData.name.trim() === '') {
        error = 'Agent-Name darf nicht leer sein';
        return;
      }
      
      const trimmedName = formData.name.trim();
      
      // Prepare agent config
      const agentConfig: Omit<any, 'created_at' | 'updated_at'> = {
        name: trimmedName,
        enabled: formData.enabled,
        model: formData.model,
        schedule: formData.schedule,
        system_prompt: formData.system_prompt || undefined,
        max_tokens_per_turn: formData.max_tokens_per_turn,
        max_steps: formData.max_steps || 5,
        budget_daily_tokens: formData.budget_daily_tokens,
        timeout_minutes: formData.timeout_minutes,
        turns: formData.turns.map((turn: any, index: number) => ({
          id: turn.id !== undefined ? turn.id : index,
          name: turn.name || `Turn ${index + 1}`,
          max_tokens: turn.max_tokens || 1500,
          max_steps: turn.max_steps,
          mcps: turn.mcps || [],
          tools: turn.tools || [],
          prompt: turn.prompt || undefined,
          prompt_file: turn.prompt_file || undefined,
          model: turn.model && turn.model !== formData.model ? turn.model : undefined,
          rules: turn.rules || undefined
        }))
      };
      
      if (isNew) {
        // Create new agent
        await coalescenceClient.createAgent(agentConfig);
        await coalescenceClient.reloadAgents();
        goto(`/coalescence/agents/${trimmedName}`);
      } else {
        // Update existing agent
        await coalescenceClient.updateAgent(trimmedName, agentConfig);
        await coalescenceClient.reloadAgents();
        goto(`/coalescence/agents/${trimmedName}`);
      }
    } catch (e: any) {
      error = e instanceof Error ? e.message : 'Failed to save agent';
      console.error('Error saving agent:', e);
    } finally {
      saving = false;
    }
  }

  function handleCancel() {
    if (isNew) {
      goto('/coalescence/agents');
    } else {
      goto(`/coalescence/agents/${agentName}`);
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<div class="h-full flex flex-col">
  {#if loading}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="inline-block animate-spin text-5xl mb-4">⚙️</div>
        <div class="text-xl text-neutral-400 font-medium">Agent wird geladen...</div>
      </div>
    </div>
  {:else if error && !agent && !isNew}
    <div class="flex-1 flex items-center justify-center px-8">
      <div class="bg-gradient-to-r from-red-900/40 to-red-800/30 border-2 border-red-600/50 rounded-xl p-6 text-red-300 shadow-lg shadow-red-900/30 max-w-2xl">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">⚠️</span>
          <h2 class="text-xl font-bold">Fehler beim Laden</h2>
        </div>
        <p class="mb-4">{error}</p>
        <button
          on:click={() => goto('/coalescence/agents')}
          class="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
        >
          Zurück zur Übersicht
        </button>
      </div>
    </div>
  {:else}
    {#if saving}
      <div class="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <div class="inline-block animate-spin">💾</div>
        <span>Speichere Agent...</span>
      </div>
    {/if}

    {#if error}
      <div class="fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
        <span>⚠️</span>
        <span>{error}</span>
      </div>
    {/if}

    <AgentEditView
      {agent}
      {availableRules}
      on:save={handleSave}
      on:cancel={handleCancel}
    />
  {/if}
</div>


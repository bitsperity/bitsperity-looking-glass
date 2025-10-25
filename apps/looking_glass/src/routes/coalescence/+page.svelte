<script lang="ts">
  import { onMount } from 'svelte';
  import { coalescenceClient } from '$lib/coalescence-client';
  import type { CoalescenceAgentStats, CoalescenceRun } from '$lib/coalescence-client';

  let agents: CoalescenceAgentStats[] = [];
  let runs: CoalescenceRun[] = [];
  let totalCost = 0;
  let loading = true;
  let error: string | null = null;

  async function loadData() {
    try {
      loading = true;
      error = null;

      // Load agents
      const agentsResult = await coalescenceClient.getAgents();
      agents = agentsResult.agents;

      // Load recent runs
      const runsResult = await coalescenceClient.getRuns({ days: 1 });
      runs = runsResult.runs;

      // Load today's costs
      const today = new Date().toISOString().split('T')[0];
      const costsResult = await coalescenceClient.getCosts(today);
      totalCost = costsResult.total_cost;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  });

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  const formatTokens = (tokens: number) => tokens.toLocaleString();
</script>

<div class="coalescence-page">
  <div class="coalescence-panel">
    <div class="coalescence-panel-header">
      <h2 class="text-xl font-bold">📊 Overview</h2>
    </div>
    <div class="coalescence-panel-content">
      {#if loading}
        <div class="text-center py-8">Loading...</div>
      {:else if error}
        <div class="text-red-400 py-8">Error: {error}</div>
      {:else}
        <div class="space-y-6">
          <!-- Cost Summary -->
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-neutral-800 p-4 rounded">
              <div class="text-sm text-neutral-400">Today's Cost</div>
              <div class="text-2xl font-bold">{formatCost(totalCost)}</div>
            </div>
            <div class="bg-neutral-800 p-4 rounded">
              <div class="text-sm text-neutral-400">Agents</div>
              <div class="text-2xl font-bold">{agents.filter(a => a.enabled).length}/{agents.length}</div>
            </div>
            <div class="bg-neutral-800 p-4 rounded">
              <div class="text-sm text-neutral-400">Runs (24h)</div>
              <div class="text-2xl font-bold">{runs.length}</div>
            </div>
          </div>

          <!-- Agents Status -->
          <div>
            <h3 class="font-semibold mb-3">🤖 Agents</h3>
            <div class="space-y-2">
              {#each agents as agent}
                <div class="bg-neutral-800 p-3 rounded flex justify-between items-center">
                  <div>
                    <div class="font-medium">{agent.name}</div>
                    <div class="text-xs text-neutral-400">{agent.enabled ? '✅ Active' : '⏸ Disabled'}</div>
                  </div>
                  <div class="text-right text-sm">
                    <div>{formatTokens(agent.total_tokens)} tokens</div>
                    <div class="text-neutral-400">{formatCost(agent.total_cost_usd)}</div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Recent Runs -->
          <div>
            <h3 class="font-semibold mb-3">🏃 Recent Runs</h3>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              {#each runs.slice(0, 10) as run}
                <div class="bg-neutral-800 p-2 rounded text-sm">
                  <div class="flex justify-between">
                    <span class="font-medium">{run.agent}</span>
                    <span class="text-neutral-400">{formatCost(run.cost_usd)}</span>
                  </div>
                  <div class="text-xs text-neutral-400">
                    {run.status} · {formatTokens(run.total_tokens)} tokens
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(.coalescence-page) {
    flex: 1;
    display: flex;
    overflow: hidden;
    gap: 1rem;
    padding: 1rem;
  }

  :global(.coalescence-panel) {
    flex: 1;
    background: #0a0a0a;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #333;
  }

  :global(.coalescence-panel-header) {
    padding: 1rem;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
  }

  :global(.coalescence-panel-content) {
    flex: 1;
    overflow: auto;
    padding: 1rem;
  }
</style>

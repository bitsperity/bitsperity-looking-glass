<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { coalescenceClient, type DashboardStats, type CoalescenceAgentStats, type CoalescenceRun } from '$lib/coalescence-client';
  import CostDisplay from '$lib/components/coalescence/CostDisplay.svelte';
  import TokenDisplay from '$lib/components/coalescence/TokenDisplay.svelte';
  import StatusBadge from '$lib/components/coalescence/StatusBadge.svelte';

  let dashboard: DashboardStats | null = null;
  let agents: CoalescenceAgentStats[] = [];
  let recentRuns: CoalescenceRun[] = [];
  let loading = true;
  let error: string | null = null;
  let triggering: Set<string> = new Set();

  async function loadData() {
    try {
      loading = true;
      error = null;
      const [dashData, agentList, runList] = await Promise.all([
        coalescenceClient.getDashboard(7),
        coalescenceClient.getAgents().then((r) => r.agents),
        coalescenceClient.getRuns({ days: 7 }).then((r) => r.runs.slice(0, 5))
      ]);
      dashboard = dashData;
      agents = agentList;
      recentRuns = runList;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load dashboard';
    } finally {
      loading = false;
    }
  }

  async function triggerAgent(agentName: string) {
    try {
      triggering.add(agentName);
      triggering = triggering;
      error = null;
      await coalescenceClient.triggerAgent(agentName);
      // Reload after a short delay
      setTimeout(() => {
        loadData();
        triggering.delete(agentName);
        triggering = triggering;
      }, 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to trigger agent';
      triggering.delete(agentName);
      triggering = triggering;
    }
  }

  function formatDate(isoString: string) {
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  }

  onMount(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  });
</script>

<div class="flex-1 overflow-auto px-6 pb-6">
  {#if error}
    <div class="bg-red-900/30 border border-red-700 rounded p-4 mb-6 text-red-400">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center h-64 text-neutral-400">
      <div>Loading dashboard...</div>
    </div>
  {:else if dashboard}
    <!-- KPI Cards -->
    <div class="grid grid-cols-4 gap-4 mb-8">
      <div class="bg-neutral-800 border border-neutral-700 rounded p-6">
        <div class="text-sm text-neutral-400 mb-2">Total Cost (7d)</div>
        <div class="text-3xl font-bold mb-2">
          <CostDisplay cost={dashboard.total.cost} showDetail={false} />
        </div>
        <div class="text-xs text-neutral-500">{dashboard.total.runs} runs</div>
      </div>

      <div class="bg-neutral-800 border border-neutral-700 rounded p-6">
        <div class="text-sm text-neutral-400 mb-2">Total Tokens (7d)</div>
        <div class="text-3xl font-bold mb-2">
          <TokenDisplay tokens={dashboard.total.tokens} />
        </div>
        <div class="text-xs text-neutral-500">Across all agents</div>
      </div>

      <div class="bg-neutral-800 border border-neutral-700 rounded p-6">
        <div class="text-sm text-neutral-400 mb-2">Active Agents</div>
        <div class="text-3xl font-bold mb-2">{dashboard.total.agents}</div>
        <div class="text-xs text-neutral-500">Ready to run</div>
      </div>

      <div class="bg-neutral-800 border border-neutral-700 rounded p-6">
        <div class="text-sm text-neutral-400 mb-2">Avg Cost per Run</div>
        <div class="text-3xl font-bold mb-2">
          <CostDisplay cost={dashboard.total.runs > 0 ? dashboard.total.cost / dashboard.total.runs : 0} showDetail={false} />
        </div>
        <div class="text-xs text-neutral-500">Last 7 days</div>
      </div>
    </div>

    <!-- Agents Grid -->
    <div class="mb-8">
      <h2 class="text-xl font-bold mb-4">Agents</h2>
      <div class="grid grid-cols-3 gap-4">
        {#each agents as agent}
          <div class="bg-neutral-800 border border-neutral-700 rounded p-6 hover:border-neutral-600 transition-colors">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="font-semibold text-lg">{agent.name}</h3>
                <div class="text-xs text-neutral-400 mt-1">
                  {agent.enabled ? '✅ Enabled' : '❌ Disabled'}
                </div>
              </div>
              <button
                on:click={() => triggerAgent(agent.name)}
                disabled={!agent.enabled || triggering.has(agent.name)}
                class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 rounded transition-colors"
              >
                {triggering.has(agent.name) ? '▶️' : '▶️ Run'}
              </button>
            </div>

            <div class="space-y-2 text-sm">
              <div>
                <div class="text-xs text-neutral-500">Model</div>
                <div class="text-neutral-300">{agent.model || 'N/A'}</div>
              </div>
              <div>
                <div class="text-xs text-neutral-500">Total Runs</div>
                <div class="text-neutral-300">{agent.total_runs}</div>
              </div>
              <div>
                <div class="text-xs text-neutral-500">Total Cost</div>
                <div class="text-neutral-300">
                  <CostDisplay cost={agent.total_cost_usd} showDetail={false} />
                </div>
              </div>
              {#if agent.last_run_at}
                <div>
                  <div class="text-xs text-neutral-500">Last Run</div>
                  <div class="text-neutral-300">{formatDate(agent.last_run_at)}</div>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Recent Runs -->
    <div>
      <h2 class="text-xl font-bold mb-4">Recent Runs</h2>
      <div class="border border-neutral-700 rounded overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-neutral-800 border-b border-neutral-700">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Agent</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Tokens</th>
              <th class="px-4 py-3 text-left font-semibold">Cost</th>
              <th class="px-4 py-3 text-left font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {#each recentRuns as run}
              <tr
                on:click={() => goto(`/coalescence/runs/${run.id}`)}
                class="border-b border-neutral-700 hover:bg-neutral-700/30 cursor-pointer transition-colors"
              >
                <td class="px-4 py-3 font-semibold">{run.agent}</td>
                <td class="px-4 py-3">
                  <StatusBadge
                    status={run.status === 'success'
                      ? 'success'
                      : run.status === 'error'
                        ? 'error'
                        : 'running'}
                  />
                </td>
                <td class="px-4 py-3">
                  <TokenDisplay tokens={run.total_tokens} />
                </td>
                <td class="px-4 py-3">
                  <CostDisplay cost={run.cost_usd} showDetail={false} />
                </td>
                <td class="px-4 py-3 text-neutral-400 text-xs">{formatDate(run.created_at)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="mt-4">
        <button
          on:click={() => goto('/coalescence/runs')}
          class="px-4 py-2 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
        >
          View all runs →
        </button>
      </div>
    </div>
  {/if}
</div>

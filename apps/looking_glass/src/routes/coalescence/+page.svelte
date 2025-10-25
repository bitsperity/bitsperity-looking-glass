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
      const prevAgents = agents;
      loading = true;
      error = null;
      const [dashData, agentStats, config, runList] = await Promise.all([
        coalescenceClient.getDashboard(7),
        coalescenceClient.getAgents().then((r) => r.agents),
        coalescenceClient.getConfigAgents(),
        coalescenceClient.getRuns({ days: 7 }).then((r) => r.runs.slice(0, 5))
      ]);
      
      dashboard = dashData;
      recentRuns = runList;
      
      // Merge config agents with stats
      if (config.parsed?.agents) {
        agents = Object.entries(config.parsed.agents).map(([name, agentConfig]: [string, any]) => {
          const stats = agentStats.find((s: any) => s.name === name);
          return {
            name,
            enabled: agentConfig.enabled ?? false,
            model: agentConfig.model || 'N/A',
            schedule: agentConfig.schedule || 'N/A',
            total_runs: stats?.total_runs || 0,
            total_cost_usd: stats?.total_cost_usd || 0,
            last_run_at: stats?.last_run_at
          };
        });
      } else {
        agents = agentStats;
      }
      
      // Only show loading on first load
      if (prevAgents.length === 0) {
        loading = false;
      } else {
        loading = false;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load dashboard';
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

<div class="flex-1 overflow-auto px-8 pb-8">
  {#if error}
    <div class="bg-gradient-to-r from-red-900/40 to-red-800/30 border-2 border-red-600/50 rounded-xl p-5 mb-8 text-red-300 shadow-lg shadow-red-900/30 flex items-center gap-3">
      <span class="text-2xl">⚠️</span>
      <div class="flex-1">{error}</div>
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center h-96">
      <div class="text-center">
        <div class="inline-block animate-spin text-5xl mb-4">⚙️</div>
        <div class="text-xl text-neutral-400 font-medium">Dashboard wird geladen...</div>
      </div>
    </div>
  {:else if dashboard}
    <!-- KPI Cards -->
    <div class="grid grid-cols-4 gap-6 mb-10">
      <!-- Total Cost Card -->
      <div class="group relative bg-gradient-to-br from-emerald-900/40 to-neutral-800 border border-emerald-700/30 rounded-xl p-6 shadow-lg hover:shadow-emerald-500/20 hover:border-emerald-600/50 transition-all duration-300">
        <div class="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-30 transition-opacity">💰</div>
        <div class="text-sm font-medium text-emerald-400 mb-3 uppercase tracking-wide">Total Cost (7d)</div>
        <div class="text-4xl font-bold mb-2 text-white">
          <CostDisplay cost={dashboard.total.cost} showDetail={false} />
        </div>
        <div class="text-xs text-neutral-400 flex items-center gap-1">
          <span class="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          {dashboard.total.runs} runs
        </div>
      </div>

      <!-- Total Tokens Card -->
      <div class="group relative bg-gradient-to-br from-blue-900/40 to-neutral-800 border border-blue-700/30 rounded-xl p-6 shadow-lg hover:shadow-blue-500/20 hover:border-blue-600/50 transition-all duration-300">
        <div class="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-30 transition-opacity">⚡</div>
        <div class="text-sm font-medium text-blue-400 mb-3 uppercase tracking-wide">Total Tokens (7d)</div>
        <div class="text-4xl font-bold mb-2 text-white">
          <TokenDisplay tokens={dashboard.total.tokens} />
        </div>
        <div class="text-xs text-neutral-400 flex items-center gap-1">
          <span class="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          Across all agents
        </div>
      </div>

      <!-- Active Agents Card -->
      <div class="group relative bg-gradient-to-br from-purple-900/40 to-neutral-800 border border-purple-700/30 rounded-xl p-6 shadow-lg hover:shadow-purple-500/20 hover:border-purple-600/50 transition-all duration-300">
        <div class="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-30 transition-opacity">🤖</div>
        <div class="text-sm font-medium text-purple-400 mb-3 uppercase tracking-wide">Active Agents</div>
        <div class="text-4xl font-bold mb-2 text-white">{dashboard.total.agents}</div>
        <div class="text-xs text-neutral-400 flex items-center gap-1">
          <span class="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
          Ready to run
        </div>
      </div>

      <!-- Avg Cost Card -->
      <div class="group relative bg-gradient-to-br from-amber-900/40 to-neutral-800 border border-amber-700/30 rounded-xl p-6 shadow-lg hover:shadow-amber-500/20 hover:border-amber-600/50 transition-all duration-300">
        <div class="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-30 transition-opacity">📊</div>
        <div class="text-sm font-medium text-amber-400 mb-3 uppercase tracking-wide">Avg Cost per Run</div>
        <div class="text-4xl font-bold mb-2 text-white">
          <CostDisplay cost={dashboard.total.runs > 0 ? dashboard.total.cost / dashboard.total.runs : 0} showDetail={false} />
        </div>
        <div class="text-xs text-neutral-400 flex items-center gap-1">
          <span class="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
          Last 7 days
        </div>
      </div>
    </div>

    <!-- Agents Grid -->
    <div class="mb-10">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white flex items-center gap-3">
          <span class="text-3xl">🤖</span>
          Agents
        </h2>
      </div>
      {#if agents.length === 0}
        <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-12 text-center">
          <div class="text-5xl mb-4 opacity-30">🔍</div>
          <div class="text-xl text-neutral-400 mb-2">Keine Agents gefunden</div>
          <div class="text-sm text-neutral-500">Agents werden automatisch erkannt, wenn sie konfiguriert sind</div>
        </div>
      {:else}
        <div class="grid grid-cols-3 gap-6">
          {#each agents as agent}
            <div class="group relative bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-500/50 hover:scale-[1.02] transition-all duration-300">
              <!-- Status Indicator -->
              <div class="absolute top-4 right-4 w-3 h-3 rounded-full {agent.enabled ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-neutral-500'} animate-pulse"></div>
              
              <div class="flex items-start justify-between mb-5">
                <div class="flex-1">
                  <h3 class="font-bold text-xl mb-2 text-white group-hover:text-blue-400 transition-colors">{agent.name}</h3>
                  <div class="inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full {agent.enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-neutral-700 text-neutral-400 border border-neutral-600'}">
                    <span class="w-1.5 h-1.5 rounded-full {agent.enabled ? 'bg-green-400' : 'bg-neutral-400'}"></span>
                    {agent.enabled ? 'Aktiv' : 'Inaktiv'}
                  </div>
                </div>
                <button
                  on:click={() => triggerAgent(agent.name)}
                  disabled={!agent.enabled || triggering.has(agent.name)}
                  class="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-neutral-700 disabled:to-neutral-800 disabled:cursor-not-allowed rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all duration-200 flex items-center gap-2"
                >
                  {#if triggering.has(agent.name)}
                    <span class="animate-spin">⚙️</span>
                  {:else}
                    ▶️
                  {/if}
                  <span>Run</span>
                </button>
              </div>

              <div class="space-y-3.5">
                <div class="flex items-center justify-between py-2.5 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                  <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Model</div>
                  <div class="text-sm font-semibold text-white">{agent.model || 'N/A'}</div>
                </div>
                <div class="flex items-center justify-between py-2.5 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                  <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Total Runs</div>
                  <div class="text-sm font-semibold text-blue-400">{agent.total_runs}</div>
                </div>
                <div class="flex items-center justify-between py-2.5 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                  <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Total Cost</div>
                  <div class="text-sm font-semibold text-emerald-400">
                    <CostDisplay cost={agent.total_cost_usd} showDetail={false} />
                  </div>
                </div>
                {#if agent.last_run_at}
                  <div class="flex items-center justify-between py-2.5 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                    <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">Last Run</div>
                    <div class="text-sm font-semibold text-neutral-300">{formatDate(agent.last_run_at)}</div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Recent Runs -->
    <div>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white flex items-center gap-3">
          <span class="text-3xl">🏃</span>
          Recent Runs
        </h2>
      </div>
      <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-lg">
        <table class="w-full text-sm">
          <thead class="bg-gradient-to-r from-neutral-800 to-neutral-900 border-b-2 border-neutral-600">
            <tr>
              <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Agent</th>
              <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Status</th>
              <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Tokens</th>
              <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Cost</th>
              <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Created</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-700/50">
            {#each recentRuns as run, i}
              <tr
                on:click={() => goto(`/coalescence/runs/${run.id}`)}
                class="group hover:bg-gradient-to-r hover:from-blue-900/20 hover:to-transparent cursor-pointer transition-all duration-200 {i % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent'}"
              >
                <td class="px-6 py-4 font-bold text-white group-hover:text-blue-400 transition-colors">{run.agent}</td>
                <td class="px-6 py-4">
                  <StatusBadge
                    status={run.status === 'success'
                      ? 'success'
                      : run.status === 'error'
                        ? 'error'
                        : 'running'}
                  />
                </td>
                <td class="px-6 py-4 font-semibold text-blue-400">
                  <TokenDisplay tokens={run.total_tokens} />
                </td>
                <td class="px-6 py-4 font-semibold text-emerald-400">
                  <CostDisplay cost={run.cost_usd} showDetail={false} />
                </td>
                <td class="px-6 py-4 text-neutral-400 text-xs font-medium">{formatDate(run.created_at)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="mt-6 flex justify-center">
        <button
          on:click={() => goto('/coalescence/runs')}
          class="group px-6 py-3 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-200 flex items-center gap-2"
        >
          <span>Alle Runs anzeigen</span>
          <span class="group-hover:translate-x-1 transition-transform">→</span>
        </button>
      </div>
    </div>
  {/if}
</div>

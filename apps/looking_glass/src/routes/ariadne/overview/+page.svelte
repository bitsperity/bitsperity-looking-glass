<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchDashboard } from '$lib/services/ariadneService';
  import type { HealthResponse, StatsResponse, Hypothesis } from '$lib/types/ariadne';

  let loading = true;
  let error: string | null = null;
  let health: HealthResponse | null = null;
  let stats: StatsResponse | null = null;
  let pendingHypotheses: Hypothesis[] = [];

  onMount(async () => {
    try {
      const data = await fetchDashboard();
      health = data.health;
      stats = data.stats;
      pendingHypotheses = data.pending.hypotheses;
    } catch (e: any) {
      error = e?.message ?? 'Failed to load dashboard';
    } finally {
      loading = false;
    }
  });
</script>

<div class="flex-1 overflow-auto">
  <div class="max-w-7xl mx-auto p-8">
    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent mb-2">
        Overview
      </h1>
      <p class="text-neutral-400">Knowledge graph status and insights at a glance</p>
    </div>

    {#if loading}
      <div class="text-neutral-400 text-center py-12">Loading dashboard...</div>
    {:else if error}
      <div class="bg-gradient-to-r from-red-900/40 to-red-800/30 border border-red-600/50 rounded-xl p-6 text-red-300">
        Error: {error}
      </div>
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <!-- Health Status Card -->
        <div class="lg:col-span-1 bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 border border-neutral-700/50 rounded-xl p-6 backdrop-blur-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-neutral-300 uppercase tracking-wide">System Health</h3>
            <div class="w-3 h-3 rounded-full {health?.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}"></div>
          </div>

          <div class="space-y-3">
            <div>
              <div class="text-xs text-neutral-500 mb-1">API Status</div>
              <div class="text-lg font-semibold text-neutral-100">
                {health?.status === 'ok' ? '✅ Healthy' : '⚠️ Degraded'}
              </div>
            </div>
            <div class="pt-3 border-t border-neutral-700/50">
              <div class="text-xs text-neutral-500 mb-1">Neo4j Connection</div>
              <div class="text-lg font-semibold {health?.neo4j_connected ? 'text-emerald-400' : 'text-red-400'}">
                {health?.neo4j_connected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
            </div>
          </div>
        </div>

        <!-- Graph Stats -->
        {#if stats}
          <div class="lg:col-span-2 grid grid-cols-2 gap-4">
            <!-- Nodes -->
            <div class="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-600/30 rounded-xl p-6 backdrop-blur-sm">
              <div class="text-xs text-indigo-400 uppercase tracking-wide mb-3 font-semibold">Total Nodes</div>
              <div class="text-4xl font-bold text-indigo-300 mb-2">{stats.total_nodes}</div>
              <div class="text-xs text-neutral-400">
                <span class="text-indigo-400 font-semibold">{Object.keys(stats.nodes_by_label).length}</span> types
              </div>
            </div>

            <!-- Edges -->
            <div class="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-600/30 rounded-xl p-6 backdrop-blur-sm">
              <div class="text-xs text-cyan-400 uppercase tracking-wide mb-3 font-semibold">Total Relations</div>
              <div class="text-4xl font-bold text-cyan-300 mb-2">{stats.total_edges}</div>
              <div class="text-xs text-neutral-400">
                Density: <span class="text-cyan-400 font-semibold">
                  {stats.total_nodes > 0 ? ((stats.total_edges / stats.total_nodes) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            <!-- Density -->
            <div class="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-600/30 rounded-xl p-6 backdrop-blur-sm">
              <div class="text-xs text-emerald-400 uppercase tracking-wide mb-3 font-semibold">Average Degree</div>
              <div class="text-4xl font-bold text-emerald-300 mb-2">
                {stats.total_nodes > 0 ? (stats.total_edges / stats.total_nodes * 2).toFixed(1) : 0}
              </div>
              <div class="text-xs text-neutral-400">connections per node</div>
            </div>

            <!-- Node Types -->
            <div class="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-600/30 rounded-xl p-6 backdrop-blur-sm">
              <div class="text-xs text-purple-400 uppercase tracking-wide mb-3 font-semibold">Node Types</div>
              <div class="text-4xl font-bold text-purple-300 mb-2">{Object.keys(stats.nodes_by_label).length}</div>
              <div class="text-xs text-neutral-400">entity categories</div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Node Distribution -->
      {#if stats}
        <div class="bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 border border-neutral-700/50 rounded-xl p-6 backdrop-blur-sm mb-12">
          <h3 class="text-lg font-semibold text-neutral-100 mb-4">Entity Distribution</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {#each Object.entries(stats.nodes_by_label).sort(([, a], [, b]) => b - a) as [label, count]}
              <div class="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3 text-center">
                <div class="text-xs text-neutral-400 mb-1">{label}</div>
                <div class="text-2xl font-bold text-indigo-300">{count}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Pending Actions -->
      {#if pendingHypotheses.length > 0}
        <div class="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-600/30 rounded-xl p-6 backdrop-blur-sm">
          <h3 class="text-lg font-semibold text-neutral-100 mb-4 flex items-center gap-2">
            <span>⚠️ Pending Actions</span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
              <div class="w-2 h-2 rounded-full bg-amber-400"></div>
              <span class="text-xs text-amber-300 font-semibold">{pendingHypotheses.length}</span>
            </span>
          </h3>
          <div class="space-y-2">
            {#each pendingHypotheses.slice(0, 5) as hyp}
              <div class="flex items-center justify-between bg-neutral-800/30 border border-neutral-700/30 rounded-lg p-3 hover:bg-neutral-800/50 transition-colors">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-neutral-100 truncate">{hyp.statement}</div>
                  <div class="text-xs text-neutral-500 mt-1">
                    Evidence: {hyp.evidence_count} | Contradictions: {hyp.contradiction_count}
                  </div>
                </div>
                <a
                  href="/ariadne/intelligence"
                  class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium ml-4 whitespace-nowrap transition-all"
                >
                  Review
                </a>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

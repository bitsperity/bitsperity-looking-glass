<script lang="ts">
  import { onMount } from 'svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  
  interface OverviewData {
    session_id: string;
    summary: {
      total_thoughts: number;
      network_density: number;
      average_relations: number;
    };
    statistics: {
      total_thoughts: number;
      distributions: {
        by_type: Record<string, number>;
        by_status: Record<string, number>;
        by_confidence: Record<string, number>;
        by_month: Record<string, number>;
      };
      relations: {
        thoughts_with_relations: number;
        total_relations: number;
        avg_relations_per_thought: number;
      };
      hierarchy: {
        thoughts_with_parent: number;
        orphan_thoughts: number;
      };
    };
    metrics: {
      network: {
        total_nodes: number;
        total_edges: number;
        density: number;
        average_degree: number;
        relation_types: Record<string, number>;
      };
      centrality: {
        top_by_degree: Array<{id: string; title: string; degree: number; type: string}>;
      };
      degree_distribution: {
        min: number;
        max: number;
        median: number;
        isolated_nodes: number;
      };
    };
  }

  let overview: OverviewData | null = null;
  let loading = false;
  let error: string | null = null;
  let sessionId = '';

  async function loadOverview() {
    loading = true;
    error = null;
    try {
      const url = new URL('http://localhost:8083/v1/memory/overview');
      if (sessionId) {
        url.searchParams.set('session_id', sessionId);
      }
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Failed to load overview');
      overview = await resp.json();
    } catch (e: any) {
      error = e?.message ?? 'Error loading overview';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadOverview();
  });

  function getHealthColor(density: number) {
    if (density > 0.5) return '#10b981';
    if (density > 0.1) return '#f59e0b';
    return '#ef4444';
  }

  function getHealthLabel(density: number) {
    if (density > 0.5) return 'Excellent';
    if (density > 0.1) return 'Moderate';
    return 'Sparse';
  }
</script>

<div class="p-6 space-y-6 h-full overflow-auto bg-gradient-to-b from-slate-900 via-slate-900 to-neutral-900">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
      Thought System Analytics
    </h1>
    <p class="text-neutral-400 text-sm">Deep insights into your thought network structure and quality</p>
  </div>

  <ManifoldNav />

  <!-- Session Filter -->
  <div class="bg-neutral-900/50 border border-neutral-700 rounded-lg p-4">
    <div class="flex gap-3">
      <input
        type="text"
        placeholder="Optional session ID..."
        bind:value={sessionId}
        class="flex-1 px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        on:click={loadOverview}
        disabled={loading}
        class="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 text-sm font-semibold text-white transition-all"
      >
        {loading ? 'Loading...' : 'Load'}
      </button>
    </div>
  </div>

  {#if error}
    <div class="p-4 rounded-lg bg-red-950/30 border border-red-500/50 text-red-300 text-sm">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="space-y-4">
      <div class="h-20 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-pulse"></div>
      <div class="h-20 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-pulse"></div>
    </div>
  {:else if overview}
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-gradient-to-br from-indigo-950/50 to-indigo-900/20 border border-indigo-500/30 rounded-lg p-4">
        <div class="text-xs font-semibold text-indigo-400 mb-2">Total Thoughts</div>
        <div class="text-3xl font-bold text-indigo-300">{overview.summary.total_thoughts}</div>
        <div class="text-xs text-indigo-300/70 mt-2">{overview.metrics.degree_distribution.isolated_nodes} isolated</div>
      </div>

      <div class="bg-gradient-to-br from-purple-950/50 to-purple-900/20 border border-purple-500/30 rounded-lg p-4">
        <div class="text-xs font-semibold text-purple-400 mb-2">Network Health</div>
        <div class="text-2xl font-bold" style="color: {getHealthColor(overview.summary.network_density)}">
          {getHealthLabel(overview.summary.network_density)}
        </div>
        <div class="text-xs text-purple-300/70 mt-2">Density: {(overview.summary.network_density * 100).toFixed(2)}%</div>
      </div>

      <div class="bg-gradient-to-br from-emerald-950/50 to-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
        <div class="text-xs font-semibold text-emerald-400 mb-2">Relations</div>
        <div class="text-3xl font-bold text-emerald-300">{overview.statistics.relations.total_relations}</div>
        <div class="text-xs text-emerald-300/70 mt-2">{overview.statistics.relations.avg_relations_per_thought.toFixed(2)} per thought</div>
      </div>
    </div>

    <!-- Distributions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Type Distribution -->
      <GlassPanel>
        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-neutral-100">📊 By Type</h2>
          <div class="space-y-2">
            {#each Object.entries(overview.statistics.distributions.by_type) as [type, count]}
              <div class="space-y-1">
                <div class="flex justify-between text-sm">
                  <span class="text-neutral-300 capitalize">{type}</span>
                  <span class="text-indigo-400 font-medium">{count}</span>
                </div>
                <div class="h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                    style="width: {(count / overview.summary.total_thoughts) * 100}%"
                  />
                </div>
              </div>
            {/each}
          </div>
        </div>
      </GlassPanel>

      <!-- Status Distribution -->
      <GlassPanel>
        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-neutral-100">✓ By Status</h2>
          <div class="space-y-2">
            {#each Object.entries(overview.statistics.distributions.by_status) as [status, count]}
              <div class="space-y-1">
                <div class="flex justify-between text-sm">
                  <span class="text-neutral-300 capitalize">{status}</span>
                  <span class="text-emerald-400 font-medium">{count}</span>
                </div>
                <div class="h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                    style="width: {(count / overview.summary.total_thoughts) * 100}%"
                  />
                </div>
              </div>
            {/each}
          </div>
        </div>
      </GlassPanel>
    </div>

    <!-- Hierarchy & Confidence -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <GlassPanel>
        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-neutral-100">🌳 Hierarchy</h2>
          <div class="space-y-3">
            <div class="bg-neutral-800/50 rounded p-3">
              <div class="text-xs text-neutral-400 mb-1">Parent-Child Relationships</div>
              <div class="text-2xl font-bold text-indigo-400">{overview.statistics.hierarchy.thoughts_with_parent}</div>
              <div class="text-xs text-neutral-500 mt-1">out of {overview.summary.total_thoughts}</div>
            </div>
            <div class="bg-neutral-800/50 rounded p-3">
              <div class="text-xs text-neutral-400 mb-1">Orphan Thoughts</div>
              <div class="text-2xl font-bold text-amber-400">{overview.statistics.hierarchy.orphan_thoughts}</div>
              <div class="text-xs text-neutral-500 mt-1">No parent assigned</div>
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-neutral-100">💎 By Confidence</h2>
          <div class="space-y-2">
            {#each Object.entries(overview.statistics.distributions.by_confidence) as [confidence, count]}
              <div class="space-y-1">
                <div class="flex justify-between text-sm">
                  <span class="text-neutral-300 capitalize">{confidence}</span>
                  <span class="text-purple-400 font-medium">{count}</span>
                </div>
                <div class="h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                    style="width: {(count / overview.summary.total_thoughts) * 100}%"
                  />
                </div>
              </div>
            {/each}
          </div>
        </div>
      </GlassPanel>
    </div>

    <!-- Top Central Nodes -->
    <GlassPanel>
      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-neutral-100">⭐ Most Central Thoughts</h2>
        <div class="space-y-2">
          {#each overview.metrics.centrality.top_by_degree.slice(0, 5) as thought, idx}
            <div class="bg-neutral-800/50 border border-neutral-700 rounded p-3 hover:border-indigo-500/50 transition-colors">
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold text-neutral-200 truncate">{thought.title}</div>
                  <div class="text-xs text-neutral-500 mt-1">{thought.type} • Degree: {thought.degree}</div>
                </div>
                <div class="ml-3 px-3 py-1 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-xs font-medium text-indigo-300">
                  #{idx + 1}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </GlassPanel>

    <!-- Network Metrics -->
    <GlassPanel>
      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-neutral-100">📈 Network Metrics</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-neutral-800/50 rounded p-3">
            <div class="text-xs text-neutral-400 mb-1">Total Edges</div>
            <div class="text-2xl font-bold text-indigo-400">{overview.metrics.network.total_edges}</div>
          </div>
          <div class="bg-neutral-800/50 rounded p-3">
            <div class="text-xs text-neutral-400 mb-1">Avg Degree</div>
            <div class="text-2xl font-bold text-purple-400">{overview.metrics.network.average_degree.toFixed(2)}</div>
          </div>
          <div class="bg-neutral-800/50 rounded p-3">
            <div class="text-xs text-neutral-400 mb-1">Isolated</div>
            <div class="text-2xl font-bold text-amber-400">{overview.metrics.degree_distribution.isolated_nodes}</div>
          </div>
          <div class="bg-neutral-800/50 rounded p-3">
            <div class="text-xs text-neutral-400 mb-1">Max Degree</div>
            <div class="text-2xl font-bold text-emerald-400">{overview.metrics.degree_distribution.max}</div>
          </div>
        </div>
      </div>
    </GlassPanel>
  {/if}
</div>

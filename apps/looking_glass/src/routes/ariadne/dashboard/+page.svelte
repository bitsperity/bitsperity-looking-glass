<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchDashboard } from '$lib/services/ariadneService';
  import KpiCard from '$lib/components/ariadne/KpiCard.svelte';
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

<div class="max-w-7xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Ariadne Dashboard</h1>

  {#if loading}
    <div class="text-neutral-400">Loading...</div>
  {:else if error}
    <div class="text-red-400">Error: {error}</div>
  {:else}
    <!-- Health Status -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-neutral-200 mb-3">System Status</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="API Status"
          value={health?.status === 'ok' ? 'Healthy' : 'Degraded'}
          subtitle={health?.service || ''}
        />
        <KpiCard
          title="Neo4j"
          value={health?.neo4j_connected ? 'Connected' : 'Disconnected'}
        />
        <KpiCard
          title="Pending Validations"
          value={pendingHypotheses.length}
          subtitle="Hypotheses ready for review"
        />
      </div>
    </div>

    <!-- Graph Stats -->
    {#if stats}
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-neutral-200 mb-3">Graph Statistics</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard title="Total Nodes" value={stats.total_nodes} />
          <KpiCard title="Total Edges" value={stats.total_edges} />
          <KpiCard
            title="Node Density"
            value={stats.total_nodes > 0 ? ((stats.total_edges / stats.total_nodes) * 100).toFixed(1) + '%' : '0%'}
          />
          <KpiCard title="Node Types" value={Object.keys(stats.nodes_by_label).length} />
        </div>
      </div>

      <!-- Nodes by Label -->
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-neutral-200 mb-3">Nodes by Label</h2>
        <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            {#each Object.entries(stats.nodes_by_label).sort(([,a], [,b]) => b - a) as [label, count]}
              <div class="flex items-center justify-between p-2 bg-neutral-950 rounded">
                <span class="text-sm text-neutral-300">{label}</span>
                <span class="text-sm font-semibold text-neutral-100">{count}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Edges by Type -->
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-neutral-200 mb-3">Edges by Type</h2>
        <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            {#each Object.entries(stats.edges_by_type).sort(([,a], [,b]) => b - a) as [type, count]}
              <div class="flex items-center justify-between p-2 bg-neutral-950 rounded">
                <span class="text-xs text-neutral-300">{type}</span>
                <span class="text-xs font-semibold text-neutral-100">{count}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Pending Hypotheses -->
      {#if pendingHypotheses.length > 0}
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-neutral-200 mb-3">Pending Validations</h2>
          <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
            {#each pendingHypotheses.slice(0, 5) as hyp}
              <div class="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                <div class="flex-1">
                  <div class="text-sm font-medium text-neutral-100">{hyp.statement}</div>
                  <div class="text-xs text-neutral-500">
                    Evidence: {hyp.evidence_count} | Contradictions: {hyp.contradiction_count}
                  </div>
                </div>
                <a
                  href="/ariadne/hypotheses/{hyp.id}"
                  class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-sm text-white"
                >
                  Review
                </a>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Last Updated -->
      <div class="text-xs text-neutral-600 mt-6">
        Last updated: {new Date(stats.last_updated).toLocaleString()}
      </div>
    {/if}
  {/if}
</div>


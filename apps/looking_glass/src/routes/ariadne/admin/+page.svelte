<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchDetailedStats, cleanupOrphans, resetGraph } from '$lib/services/ariadneService';
  import type { DetailedStatsResponse } from '$lib/types/ariadne';

  let loading = false;
  let stats: DetailedStatsResponse | null = null;
  let orphansDryRun = true;
  let orphansResult: any = null;
  let orphansLoading = false;
  let resetConfirm = false;
  let resetLoading = false;
  let resetResult: any = null;

  async function loadStats() {
    loading = true;
    try {
      stats = await fetchDetailedStats();
    } finally {
      loading = false;
    }
  }

  async function runCleanup() {
    orphansLoading = true;
    try {
      orphansResult = await cleanupOrphans(orphansDryRun);
    } finally {
      orphansLoading = false;
    }
  }

  async function performReset() {
    if (!resetConfirm) {
      alert('Please check the confirmation box first!');
      return;
    }

    const userConfirm = confirm(
      'DANGER: This will permanently delete ALL data in the knowledge graph!\n\n' +
      'This action cannot be undone.\n\n' +
      'Type "DELETE ALL" to confirm.'
    );

    if (!userConfirm) return;

    const typed = prompt('Type "DELETE ALL" to confirm:');
    if (typed !== 'DELETE ALL') {
      alert('Confirmation failed. Reset cancelled.');
      return;
    }

    resetLoading = true;
    try {
      resetResult = await resetGraph();
      await loadStats(); // Reload stats
      resetConfirm = false;
    } catch (e: any) {
      alert(`Failed to reset: ${e?.message ?? 'Unknown error'}`);
    } finally {
      resetLoading = false;
    }
  }

  onMount(() => {
    loadStats();
  });
</script>

<div class="max-w-7xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Admin Tools</h1>

  <!-- Stats -->
  {#if loading}
    <div class="text-neutral-400">Loading stats...</div>
  {:else if stats}
    <div class="mb-8">
      <h2 class="text-xl font-semibold text-neutral-200 mb-3">Detailed Statistics</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
          <div class="text-sm text-neutral-400">Temporal Coverage</div>
          <div class="text-2xl font-semibold text-neutral-100">{stats.temporal_coverage_pct}%</div>
        </div>
        <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
          <div class="text-sm text-neutral-400">Avg Confidence</div>
          <div class="text-2xl font-semibold text-neutral-100">
            {stats.avg_confidence ? (stats.avg_confidence * 100).toFixed(1) + '%' : 'N/A'}
          </div>
        </div>
        <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
          <div class="text-sm text-neutral-400">Edges with Confidence</div>
          <div class="text-2xl font-semibold text-neutral-100">{stats.edges_with_confidence}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
          <h3 class="text-lg font-semibold text-neutral-100 mb-2">Node Stats</h3>
          <div class="space-y-1 max-h-64 overflow-y-auto">
            {#each stats.node_stats as { label, count }}
              <div class="flex items-center justify-between text-sm">
                <span class="text-neutral-300">{label}</span>
                <span class="font-semibold text-neutral-100">{count}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
          <h3 class="text-lg font-semibold text-neutral-100 mb-2">Edge Stats</h3>
          <div class="space-y-1 max-h-64 overflow-y-auto">
            {#each stats.edge_stats as { rel_type, count }}
              <div class="flex items-center justify-between text-sm">
                <span class="text-neutral-300">{rel_type}</span>
                <span class="font-semibold text-neutral-100">{count}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- DANGER ZONE: Reset Graph -->
  <div class="bg-red-950/20 rounded border border-red-800/50 p-6 mb-8">
    <h2 class="text-xl font-semibold text-red-400 mb-4">⚠️ Danger Zone: Reset Graph</h2>
    <p class="text-sm text-neutral-400 mb-4">
      Permanently delete ALL data in the knowledge graph. This action cannot be undone!
    </p>

    <div class="flex items-center gap-3 mb-4">
      <label class="flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          bind:checked={resetConfirm}
          class="rounded bg-neutral-950 border-red-700"
        />
        I understand this will delete ALL data permanently
      </label>
    </div>

    <button
      on:click={performReset}
      disabled={!resetConfirm || resetLoading}
      class="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
    >
      {resetLoading ? 'Resetting...' : '🗑️ DELETE ALL DATA'}
    </button>

    {#if resetResult}
      <div class="mt-4 p-3 bg-green-950/50 rounded border border-green-800">
        <div class="text-sm font-medium text-green-400 mb-2">
          ✓ Graph Reset Complete
        </div>
        <div class="text-xs text-neutral-400">
          Deleted: {resetResult.deleted.nodes} nodes, {resetResult.deleted.edges} edges
        </div>
      </div>
    {/if}
  </div>

  <!-- Orphaned Nodes Cleanup -->
  <div class="bg-neutral-900 rounded border border-neutral-800 p-6">
    <h2 class="text-xl font-semibold text-neutral-200 mb-4">Orphaned Nodes Cleanup</h2>
    <p class="text-sm text-neutral-400 mb-4">
      Find and optionally delete nodes with no edges (isolated entities).
    </p>

    <div class="flex items-center gap-3 mb-4">
      <label class="flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          bind:checked={orphansDryRun}
          class="rounded bg-neutral-950 border-neutral-700"
        />
        Dry Run (just preview, don't delete)
      </label>
    </div>

    <button
      on:click={runCleanup}
      disabled={orphansLoading}
      class="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
    >
      {orphansLoading ? 'Running...' : 'Run Cleanup'}
    </button>

    {#if orphansResult}
      <div class="mt-4 p-3 bg-neutral-950 rounded border border-neutral-800">
        <div class="text-sm font-medium text-neutral-100 mb-2">
          Found {orphansResult.orphaned_count} orphaned nodes
        </div>
        <div class="text-xs text-neutral-500 mb-2">
          {orphansResult.deleted ? 'Deleted' : 'Preview (dry run)'}
        </div>
        {#if orphansResult.nodes.length > 0}
          <div class="space-y-1 max-h-48 overflow-y-auto">
            {#each orphansResult.nodes as node}
              <div class="text-xs text-neutral-400">
                {node.labels.join(', ')}: {node.name || node.ticker || node.node_id}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>


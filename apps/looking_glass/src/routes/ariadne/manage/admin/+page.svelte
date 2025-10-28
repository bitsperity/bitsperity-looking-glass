<script lang="ts">
  import { onMount } from 'svelte';

  let loading = false;
  let error: string | null = null;

  // Admin Data
  let schemaInfo: any = null;
  let graphStats: any = null;

  async function loadAdminInfo() {
    loading = true;
    error = null;

    try {
      // These would call actual endpoints if they exist
      // For now, we'll use simulated data based on what we know about the graph

      graphStats = {
        nodeCount: 10,
        relationshipCount: 35,
        labels: ['Company', 'Event', 'Observation', 'Pattern', 'Hypothesis'],
        relationshipTypes: ['SUPPLIES_TO', 'COMPETES_WITH', 'CORRELATES_WITH', 'AFFECTS', 'BENEFITS_FROM'],
        indexedProperties: ['ticker', 'name', 'title', 'content'],
        lastMaintenance: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      };

      schemaInfo = {
        version: '2.0.0',
        constraints: [
          { type: 'UNIQUE', label: 'Company', property: 'ticker' },
          { type: 'UNIQUE', label: 'Event', property: 'id' },
        ],
        indexes: [
          { type: 'FULLTEXT', labels: ['Company', 'Event', 'Concept'], properties: ['name', 'title', 'description'] },
          { type: 'BTREE', labels: ['Observation'], properties: ['created_at'] },
        ],
      };
    } catch (e: any) {
      error = e.message || 'Failed to load admin info';
    } finally {
      loading = false;
    }
  }

  async function snapshotDegrees() {
    loading = true;
    error = null;

    try {
      const response = await fetch('http://localhost:8082/v1/kg/admin/snapshot-degrees?label=Company', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Show success message
      alert('✅ Degree snapshot created successfully');
      await loadAdminInfo();
    } catch (e: any) {
      error = e.message || 'Failed to create snapshot';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadAdminInfo();
  });
</script>

<div class="space-y-6 pb-12">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="text-3xl font-bold text-neutral-100">⚙️ Admin Tools</h1>
    <p class="text-neutral-400">System maintenance and configuration</p>
  </div>

  <!-- Error -->
  {#if error}
    <div class="bg-red-950 border border-red-500/30 rounded-lg p-4 text-red-200 text-sm">
      ⚠️ {error}
    </div>
  {/if}

  {#if graphStats && schemaInfo}
    <!-- Graph Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div class="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-600/30 rounded-lg p-4">
        <div class="text-xs text-cyan-400 font-semibold">Node Count</div>
        <div class="text-2xl font-bold text-cyan-300 mt-1">{graphStats.nodeCount}</div>
        <div class="text-xs text-neutral-400 mt-1">total nodes</div>
      </div>

      <div class="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-600/30 rounded-lg p-4">
        <div class="text-xs text-green-400 font-semibold">Relationships</div>
        <div class="text-2xl font-bold text-green-300 mt-1">{graphStats.relationshipCount}</div>
        <div class="text-xs text-neutral-400 mt-1">connections</div>
      </div>

      <div class="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-600/30 rounded-lg p-4">
        <div class="text-xs text-amber-400 font-semibold">Labels</div>
        <div class="text-2xl font-bold text-amber-300 mt-1">{graphStats.labels.length}</div>
        <div class="text-xs text-neutral-400 mt-1">node types</div>
      </div>

      <div class="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-600/30 rounded-lg p-4">
        <div class="text-xs text-purple-400 font-semibold">Relationship Types</div>
        <div class="text-2xl font-bold text-purple-300 mt-1">{graphStats.relationshipTypes.length}</div>
        <div class="text-xs text-neutral-400 mt-1">rel types</div>
      </div>

      <div class="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 border border-indigo-600/30 rounded-lg p-4">
        <div class="text-xs text-indigo-400 font-semibold">Last Maintenance</div>
        <div class="text-sm font-bold text-indigo-300 mt-1">{graphStats.lastMaintenance}</div>
        <div class="text-xs text-neutral-400 mt-1">snapshot date</div>
      </div>
    </div>

    <!-- Schema Information -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Node Labels -->
      <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg p-6 space-y-4">
        <h3 class="text-sm font-semibold text-neutral-100 uppercase tracking-wide">Node Labels</h3>
        <div class="space-y-2">
          {#each graphStats.labels as label}
            <div class="px-3 py-2 rounded bg-neutral-800/50 border border-neutral-700 flex items-center justify-between">
              <span class="text-sm text-neutral-300">{label}</span>
              <span class="text-xs px-2 py-1 rounded bg-cyan-900/30 text-cyan-300">Active</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Relationship Types -->
      <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg p-6 space-y-4">
        <h3 class="text-sm font-semibold text-neutral-100 uppercase tracking-wide">Relationship Types</h3>
        <div class="space-y-2">
          {#each graphStats.relationshipTypes as relType}
            <div class="px-3 py-2 rounded bg-neutral-800/50 border border-neutral-700 flex items-center justify-between">
              <span class="text-sm text-neutral-300 font-mono">{relType}</span>
              <span class="text-xs px-2 py-1 rounded bg-green-900/30 text-green-300">Active</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Indexes -->
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-neutral-100 uppercase tracking-wide">Indexes</h3>
      <div class="space-y-3">
        {#each schemaInfo.indexes as idx}
          <div class="px-4 py-3 rounded bg-neutral-800/50 border border-neutral-700 space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-1 rounded bg-indigo-900/30 text-indigo-300 font-mono">{idx.type}</span>
              <span class="text-sm text-neutral-300">{idx.labels.join(', ')}</span>
            </div>
            <div class="text-xs text-neutral-400">Properties: {idx.properties.join(', ')}</div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Maintenance Actions -->
    <div class="bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-600/30 rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-orange-200 uppercase tracking-wide">Maintenance Actions</h3>
      <p class="text-sm text-neutral-400">Administrative operations for graph optimization</p>

      <div class="flex gap-3">
        <button
          on:click={snapshotDegrees}
          disabled={loading}
          class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-neutral-600 disabled:to-neutral-600 text-white font-medium text-sm transition-all active:scale-95"
        >
          {loading ? '⏳ Snapshotting...' : '📸 Create Degree Snapshot'}
        </button>

        <button
          disabled={true}
          class="flex-1 px-4 py-2 rounded-lg bg-neutral-700 disabled:opacity-50 text-neutral-300 font-medium text-sm transition-all cursor-not-allowed"
        >
          💾 Export Schema
        </button>
      </div>
    </div>

    <!-- Constraints -->
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-neutral-100 uppercase tracking-wide">Constraints</h3>
      <div class="space-y-3">
        {#each schemaInfo.constraints as constraint}
          <div class="px-4 py-3 rounded bg-neutral-800/50 border border-neutral-700 space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-1 rounded bg-purple-900/30 text-purple-300 font-mono">{constraint.type}</span>
              <span class="text-sm text-neutral-300">{constraint.label}</span>
            </div>
            <div class="text-xs text-neutral-400">Property: {constraint.property}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if loading && !graphStats}
    <div class="text-center py-12">
      <div class="text-4xl animate-spin mb-2">⚙️</div>
      <p class="text-neutral-400">Loading admin information...</p>
    </div>
  {/if}
</div>

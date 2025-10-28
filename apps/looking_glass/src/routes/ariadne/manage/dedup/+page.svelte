<script lang="ts">
  import { onMount } from 'svelte';

  interface DedupPair {
    node1_id: string;
    node1_name: string;
    node2_id: string;
    node2_name: string;
    similarity: number;
  }

  let loading = false;
  let error: string | null = null;
  let executing = false;

  // Parameters
  let selectedLabel = 'Company';
  let similarityThreshold = 0.85;
  let limit = 20;

  // Data
  let dedupPairs: DedupPair[] = [];
  let selectedPair: DedupPair | null = null;
  let previewData: any = null;
  let previewLoading = false;

  // Merge options
  let mergeStrategy: 'prefer_target' | 'prefer_source' | 'merge_both' = 'prefer_target';
  let dryRun = true;
  let mergeResult: any = null;

  async function loadDedupPlan() {
    loading = true;
    error = null;
    dedupPairs = [];
    selectedPair = null;
    previewData = null;

    try {
      const response = await fetch(
        `http://localhost:8082/v1/kg/admin/deduplicate/plan?label=${selectedLabel}&threshold=${similarityThreshold}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      dedupPairs = data.duplicates || [];
    } catch (e: any) {
      error = e.message || 'Failed to load deduplication plan';
    } finally {
      loading = false;
    }
  }

  async function showPreview(pair: DedupPair) {
    selectedPair = pair;
    previewLoading = true;
    previewData = null;

    // Simulate fetching node details for comparison
    // In real app, this would fetch full node data from API
    previewData = {
      node1: {
        id: pair.node1_id,
        name: pair.node1_name,
        properties: {
          type: 'Company',
          sector: 'Technology',
          ticker: 'TSL1',
          created_at: '2025-01-01',
        },
      },
      node2: {
        id: pair.node2_id,
        name: pair.node2_name,
        properties: {
          type: 'Company',
          sector: 'Technology',
          ticker: 'TSL2',
          created_at: '2025-01-02',
        },
      },
      differences: [
        { property: 'ticker', node1: 'TSL1', node2: 'TSL2' },
        { property: 'created_at', node1: '2025-01-01', node2: '2025-01-02' },
      ],
    };

    previewLoading = false;
  }

  async function executeMerge() {
    if (!selectedPair) return;

    executing = true;
    mergeResult = null;
    error = null;

    try {
      const response = await fetch('http://localhost:8082/v1/kg/admin/deduplicate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: selectedPair.node1_id,
          target_id: selectedPair.node2_id,
          strategy: mergeStrategy,
          dry_run: dryRun,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      mergeResult = await response.json();

      // If not dry-run and successful, reload the plan
      if (!dryRun && mergeResult.status === 'success') {
        await loadDedupPlan();
        selectedPair = null;
      }
    } catch (e: any) {
      error = e.message || 'Failed to execute merge';
    } finally {
      executing = false;
    }
  }

  onMount(() => {
    loadDedupPlan();
  });
</script>

<div class="space-y-6 pb-12">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="text-3xl font-bold text-neutral-100">🔀 Deduplication Manager</h1>
    <p class="text-neutral-400">Find and merge duplicate entities</p>
  </div>

  <!-- Controls -->
  <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-xl p-6 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Node Label</label>
        <select
          bind:value={selectedLabel}
          class="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="Company">Company</option>
          <option value="Event">Event</option>
          <option value="Observation">Observation</option>
        </select>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Similarity: {(similarityThreshold * 100).toFixed(0)}%</label>
        <input type="range" min="0.7" max="1" step="0.05" bind:value={similarityThreshold} class="w-full" />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Max Results</label>
        <input
          type="number"
          bind:value={limit}
          min="1"
          max="100"
          class="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
    </div>

    <button
      on:click={loadDedupPlan}
      disabled={loading}
      class="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-neutral-600 disabled:to-neutral-600 text-white font-medium text-sm transition-all active:scale-95"
    >
      {loading ? '🔄 Scanning...' : '🚀 Find Duplicates'}
    </button>
  </div>

  <!-- Error -->
  {#if error}
    <div class="bg-red-950 border border-red-500/30 rounded-lg p-4 text-red-200 text-sm">
      ⚠️ {error}
    </div>
  {/if}

  <!-- Results -->
  {#if dedupPairs.length === 0 && !loading}
    <div class="text-center py-12 bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg">
      <div class="text-4xl mb-2">✓</div>
      <p class="text-neutral-400">No duplicates found above {(similarityThreshold * 100).toFixed(0)}% similarity</p>
    </div>
  {:else if dedupPairs.length > 0}
    <div class="space-y-4">
      <!-- Pair List -->
      <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-transparent">
          <h3 class="text-sm font-semibold text-neutral-100">Duplicate Pairs ({dedupPairs.length})</h3>
        </div>

        <div class="space-y-2 p-4">
          {#each dedupPairs as pair}
            <button
              on:click={() => showPreview(pair)}
              class={`w-full text-left p-4 rounded-lg border transition-all ${
                selectedPair === pair
                  ? 'bg-amber-950 border-amber-500/50'
                  : 'bg-neutral-800/50 border-neutral-700 hover:border-amber-500/30'
              }`}
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <p class="font-medium text-neutral-100">{pair.node1_name} ↔ {pair.node2_name}</p>
                  <p class="text-xs text-neutral-400 mt-1">IDs: {pair.node1_id.slice(-8)} ↔ {pair.node2_id.slice(-8)}</p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-bold text-amber-400">{Math.round(pair.similarity * 100)}%</div>
                  <div class="text-xs text-neutral-400">match</div>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Preview Section -->
      {#if selectedPair && previewData}
        <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-transparent">
            <h3 class="text-sm font-semibold text-neutral-100">Merge Preview</h3>
            <p class="text-xs text-neutral-400 mt-1">Review differences before merging</p>
          </div>

          <div class="p-6 space-y-6">
            <!-- Side-by-Side Comparison -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Node 1 -->
              <div class="bg-neutral-800/50 border border-neutral-700 rounded p-4 space-y-3">
                <h4 class="font-medium text-neutral-100 text-sm">Source Node</h4>
                <div class="space-y-2">
                  <div>
                    <div class="text-xs text-neutral-400">Name</div>
                    <div class="text-sm text-neutral-200">{previewData.node1.name}</div>
                  </div>
                  {#each Object.entries(previewData.node1.properties) as [key, value]}
                    <div>
                      <div class="text-xs text-neutral-400">{key}</div>
                      <div class="text-sm text-neutral-200">{value}</div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Node 2 -->
              <div class="bg-neutral-800/50 border border-neutral-700 rounded p-4 space-y-3">
                <h4 class="font-medium text-neutral-100 text-sm">Target Node</h4>
                <div class="space-y-2">
                  <div>
                    <div class="text-xs text-neutral-400">Name</div>
                    <div class="text-sm text-neutral-200">{previewData.node2.name}</div>
                  </div>
                  {#each Object.entries(previewData.node2.properties) as [key, value]}
                    <div>
                      <div class="text-xs text-neutral-400">{key}</div>
                      <div class="text-sm text-neutral-200">{value}</div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Differences -->
            {#if previewData.differences && previewData.differences.length > 0}
              <div class="bg-orange-950/30 border border-orange-500/30 rounded p-4 space-y-2">
                <h4 class="font-medium text-orange-200 text-sm">⚠️ Differences Found</h4>
                {#each previewData.differences as diff}
                  <div class="text-xs text-orange-100">
                    <strong>{diff.property}:</strong> "{diff.node1}" vs "{diff.node2}"
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Merge Options -->
            <div class="space-y-3 p-4 bg-neutral-800/50 border border-neutral-700 rounded">
              <h4 class="font-medium text-neutral-100 text-sm">Merge Strategy</h4>

              <div class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" bind:group={mergeStrategy} value="prefer_target" class="w-4 h-4" />
                  <span class="text-sm text-neutral-300">Prefer target (keep target properties)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" bind:group={mergeStrategy} value="prefer_source" class="w-4 h-4" />
                  <span class="text-sm text-neutral-300">Prefer source (keep source properties)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" bind:group={mergeStrategy} value="merge_both" class="w-4 h-4" />
                  <span class="text-sm text-neutral-300">Merge both (combine non-conflicting)</span>
                </label>
              </div>

              <div class="pt-2 border-t border-neutral-700">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" bind:checked={dryRun} class="w-4 h-4" />
                  <span class="text-sm text-neutral-300">🔍 Dry run (preview only, don't save)</span>
                </label>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <button
                on:click={executeMerge}
                disabled={executing}
                class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-neutral-600 disabled:to-neutral-600 text-white font-medium text-sm transition-all active:scale-95"
              >
                {executing ? '⏳ Merging...' : dryRun ? '👁️ Preview Merge' : '🔀 Execute Merge'}
              </button>
              <button
                on:click={() => (selectedPair = null)}
                class="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-medium text-sm transition-all"
              >
                Cancel
              </button>
            </div>

            <!-- Result -->
            {#if mergeResult}
              <div class={`p-4 rounded-lg border ${
                mergeResult.status === 'success'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-100'
                  : 'bg-red-950/30 border-red-500/30 text-red-100'
              }`}>
                <p class="text-sm font-medium">
                  {mergeResult.status === 'success' ? '✅ Merge successful!' : '❌ Merge failed'}
                </p>
                {#if mergeResult.merge_preview}
                  <p class="text-xs mt-2 opacity-75">{mergeResult.message || 'Nodes have been merged'}</p>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  :global(input[type='range']) {
    @apply w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer;
  }

  :global(input[type='range']::-webkit-slider-thumb) {
    @apply appearance-none w-4 h-4 bg-amber-500 rounded-full cursor-pointer hover:bg-amber-400 transition-colors;
  }

  :global(input[type='range']::-moz-range-thumb) {
    @apply w-4 h-4 bg-amber-500 rounded-full cursor-pointer hover:bg-amber-400 transition-colors border-0;
  }
</style>

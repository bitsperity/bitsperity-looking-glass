<script lang="ts">
  import { startCorrelation, startCommunityDetection } from '$lib/services/ariadneService';

  let correlationSymbols = '';
  let correlationWindow = 90;
  let correlationMethod: 'spearman' | 'pearson' = 'spearman';
  let correlationStatus = '';

  let communityStatus = '';

  async function triggerCorrelation() {
    correlationStatus = 'Starting...';
    try {
      const symbols = correlationSymbols.split(',').map((s) => s.trim()).filter((s) => s);
      await startCorrelation({
        symbols,
        window: correlationWindow,
        method: correlationMethod,
      });
      correlationStatus = 'Started! Correlation analysis is running in background.';
    } catch (e: any) {
      correlationStatus = `Error: ${e?.message ?? 'Failed to start'}`;
    }
  }

  async function triggerCommunity() {
    communityStatus = 'Starting...';
    try {
      await startCommunityDetection();
      communityStatus = 'Started! Community detection is running in background.';
    } catch (e: any) {
      communityStatus = `Error: ${e?.message ?? 'Failed to start'}`;
    }
  }
</script>

<div class="max-w-4xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Learn: Background Analytics</h1>

  <!-- Correlation -->
  <div class="mb-8 bg-neutral-900 rounded border border-neutral-800 p-6">
    <h2 class="text-xl font-semibold text-neutral-200 mb-4">Correlation Analysis</h2>
    <p class="text-sm text-neutral-400 mb-4">
      Compute price correlations between symbols and store as CORRELATES_WITH edges.
    </p>

    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Symbols (comma-separated)</label>
        <input
          type="text"
          bind:value={correlationSymbols}
          placeholder="e.g., NVDA, AMD, INTC"
          class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Window (days)</label>
          <input
            type="number"
            bind:value={correlationWindow}
            min="30"
            max="365"
            class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Method</label>
          <select
            bind:value={correlationMethod}
            class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="spearman">Spearman</option>
            <option value="pearson">Pearson</option>
          </select>
        </div>
      </div>

      <button
        on:click={triggerCorrelation}
        class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        Start Correlation Analysis
      </button>

      {#if correlationStatus}
        <div class="text-sm {correlationStatus.includes('Error') ? 'text-red-400' : 'text-green-400'}">
          {correlationStatus}
        </div>
      {/if}
    </div>
  </div>

  <!-- Community Detection -->
  <div class="bg-neutral-900 rounded border border-neutral-800 p-6">
    <h2 class="text-xl font-semibold text-neutral-200 mb-4">Community Detection</h2>
    <p class="text-sm text-neutral-400 mb-4">
      Run Louvain community detection on the company graph using Neo4j GDS.
    </p>

    <button
      on:click={triggerCommunity}
      class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
    >
      Start Community Detection
    </button>

    {#if communityStatus}
      <div class="mt-3 text-sm {communityStatus.includes('Error') ? 'text-red-400' : 'text-green-400'}">
        {communityStatus}
      </div>
    {/if}
  </div>
</div>


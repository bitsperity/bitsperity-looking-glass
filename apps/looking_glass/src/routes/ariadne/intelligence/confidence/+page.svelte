<script lang="ts">
  import { onMount } from 'svelte';

  interface PathResult {
    source_name: string;
    target_name: string;
    depth: number;
    confidence: number;
    target_type: string;
  }

  let sourceNode = 'TSLA';
  let targetLabel = 'Company';
  let maxDepth = 5;
  let mode: 'product' | 'min' | 'avg' = 'product';
  let minConfidence = 0;
  let limit = 20;

  let loading = false;
  let error: string | null = null;
  let results: PathResult[] = [];
  let stats = {
    totalPaths: 0,
    avgConfidence: 0,
    minConfidence: 0,
    maxConfidence: 0,
  };

  async function analyzeConfidence() {
    loading = true;
    error = null;
    results = [];
    stats = { totalPaths: 0, avgConfidence: 0, minConfidence: 0, maxConfidence: 0 };

    try {
      const params = new URLSearchParams({
        from_ticker: sourceNode,
        to_label: targetLabel,
        max_depth: maxDepth.toString(),
        mode,
        min_confidence: minConfidence.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`http://localhost:8082/v1/kg/analytics/confidence/propagate?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        results = data.propagations || [];
        
        if (data.summary) {
          stats = {
            totalPaths: data.count || results.length,
            avgConfidence: data.summary.avg_confidence || 0,
            minConfidence: data.summary.min_confidence || 0,
            maxConfidence: data.summary.max_confidence || 0,
          };
        } else if (results.length > 0) {
          const confidences = results.map(r => r.confidence).filter(c => typeof c === 'number');
          stats = {
            totalPaths: results.length,
            avgConfidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
            minConfidence: Math.min(...confidences),
            maxConfidence: Math.max(...confidences),
          };
        }
      }
    } catch (e: any) {
      error = e.message || 'Failed to analyze confidence';
    } finally {
      loading = false;
    }
  }

  function getConfidenceColor(conf: number): string {
    if (conf >= 0.8) return 'bg-emerald-500';
    if (conf >= 0.6) return 'bg-blue-500';
    if (conf >= 0.4) return 'bg-yellow-500';
    if (conf >= 0.2) return 'bg-orange-500';
    return 'bg-red-500';
  }

  onMount(() => {
    analyzeConfidence();
  });
</script>

<div class="space-y-6 pb-12">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="text-3xl font-bold text-neutral-100">🔗 Confidence Propagation</h1>
    <p class="text-neutral-400">Analyze transitive confidence through relationship paths</p>
  </div>

  <!-- Controls -->
  <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-xl p-6 space-y-4">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <!-- Source Node -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Source Ticker</label>
        <input
          type="text"
          bind:value={sourceNode}
          placeholder="e.g., TSLA"
          class="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      <!-- Target Label -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Target Label</label>
        <select
          bind:value={targetLabel}
          class="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="Company">Company</option>
          <option value="Event">Event</option>
          <option value="Observation">Observation</option>
          <option value="Pattern">Pattern</option>
        </select>
      </div>

      <!-- Max Depth -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Max Depth: {maxDepth}</label>
        <input
          type="range"
          min="1"
          max="10"
          bind:value={maxDepth}
          class="w-full"
        />
      </div>

      <!-- Mode -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Aggregation Mode</label>
        <select
          bind:value={mode}
          class="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="product">Product (Multiplicative)</option>
          <option value="min">Minimum</option>
          <option value="avg">Average</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Min Confidence -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Min Confidence: {Math.round(minConfidence * 100)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          bind:value={minConfidence}
          class="w-full"
        />
      </div>

      <!-- Limit -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Results Limit</label>
        <input
          type="number"
          bind:value={limit}
          min="1"
          max="100"
          class="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      <!-- Analyze Button -->
      <div class="flex items-end">
        <button
          on:click={analyzeConfidence}
          disabled={loading}
          class="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-neutral-600 disabled:to-neutral-600 text-white font-medium text-sm transition-all active:scale-95"
        >
          {loading ? '🔄 Analyzing...' : '🚀 Analyze'}
        </button>
      </div>
    </div>
  </div>

  <!-- Error -->
  {#if error}
    <div class="bg-red-950 border border-red-500/30 rounded-lg p-4 text-red-200 text-sm">
      ⚠️ {error}
    </div>
  {/if}

  <!-- Statistics -->
  {#if results.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg p-4">
        <div class="text-neutral-400 text-xs font-semibold">Total Paths</div>
        <div class="text-2xl font-bold text-cyan-400 mt-1">{stats.totalPaths}</div>
      </div>

      <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg p-4">
        <div class="text-neutral-400 text-xs font-semibold">Avg Confidence</div>
        <div class="text-2xl font-bold text-emerald-400 mt-1">{Math.round(stats.avgConfidence * 100)}%</div>
      </div>

      <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg p-4">
        <div class="text-neutral-400 text-xs font-semibold">Min Confidence</div>
        <div class="text-2xl font-bold text-orange-400 mt-1">{Math.round(stats.minConfidence * 100)}%</div>
      </div>

      <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg p-4">
        <div class="text-neutral-400 text-xs font-semibold">Max Confidence</div>
        <div class="text-2xl font-bold text-emerald-400 mt-1">{Math.round(stats.maxConfidence * 100)}%</div>
      </div>
    </div>

    <!-- Results Table -->
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-transparent">
        <h3 class="text-sm font-semibold text-neutral-100">Propagation Paths</h3>
        <p class="text-xs text-neutral-400 mt-1">Mode: {mode.toUpperCase()} aggregation</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-neutral-800/50 border-b border-neutral-700">
            <tr class="text-neutral-400 text-xs font-semibold uppercase">
              <td class="px-6 py-3">Source → Target</td>
              <td class="px-6 py-3">Confidence</td>
              <td class="px-6 py-3">Depth</td>
              <td class="px-6 py-3">Type</td>
            </tr>
          </thead>
          <tbody>
            {#each results as result}
              <tr class="border-b border-neutral-700/50 hover:bg-neutral-800/30 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-medium text-neutral-200">{result.source_name} → {result.target_name}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-2 bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        class={`h-full ${getConfidenceColor(result.confidence)} transition-all`}
                        style="width: {result.confidence * 100}%"
                      />
                    </div>
                    <span class="font-semibold text-sm text-neutral-300">
                      {Math.round(result.confidence * 100)}%
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded bg-neutral-700 text-neutral-300 text-xs font-mono">
                    {result.depth}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-xs">
                    {result.target_type}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Empty State -->
  {#if !loading && results.length === 0 && !error}
    <div class="text-center py-12">
      <div class="text-4xl mb-4">🔗</div>
      <div class="text-neutral-400">No propagation paths found. Try adjusting your parameters.</div>
    </div>
  {/if}
</div>

<style>
  :global(input[type='range']) {
    @apply w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer;
  }

  :global(input[type='range']::-webkit-slider-thumb) {
    @apply appearance-none w-4 h-4 bg-cyan-500 rounded-full cursor-pointer hover:bg-cyan-400 transition-colors;
  }

  :global(input[type='range']::-moz-range-thumb) {
    @apply w-4 h-4 bg-cyan-500 rounded-full cursor-pointer hover:bg-cyan-400 transition-colors border-0;
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';

  let loading = false;
  let error: string | null = null;
  let results: any = null;

  let ticker = 'TSLA';
  let maxDepth = 3;
  let decay = 'exponential';
  let minConfidence = 0;

  async function analyze() {
    loading = true;
    error = null;
    results = null;

    try {
      const params = new URLSearchParams({
        ticker,
        max_depth: maxDepth.toString(),
        decay,
        min_confidence: minConfidence.toString(),
      });

      const response = await fetch(`http://localhost:8082/v1/kg/decision/impact?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      results = await response.json();
    } catch (e: any) {
      error = e?.message ?? 'Failed to analyze impact';
    } finally {
      loading = false;
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 0.8) return 'from-emerald-600 to-green-600';
    if (score >= 0.6) return 'from-blue-600 to-cyan-600';
    if (score >= 0.4) return 'from-amber-600 to-orange-600';
    return 'from-red-600 to-rose-600';
  }

  onMount(() => {
    analyze();
  });
</script>

<div class="flex-1 overflow-auto">
  <div class="max-w-7xl mx-auto p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent mb-2">
        📊 Impact Simulation
      </h1>
      <p class="text-neutral-400">Propagate impact through the knowledge graph with decay functions</p>
    </div>

    <!-- Controls -->
    <div class="bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 border border-neutral-700/50 rounded-xl p-6 backdrop-blur-sm mb-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Ticker</label>
          <input
            type="text"
            bind:value={ticker}
            placeholder="e.g., TSLA"
            class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700/50 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            Max Depth: <span class="text-indigo-400 font-bold">{maxDepth}</span>
          </label>
          <input
            type="range"
            bind:value={maxDepth}
            min="1"
            max="5"
            class="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            style="accent-color: #4f46e5"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Decay Function</label>
          <select
            bind:value={decay}
            class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700/50 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
          >
            <option value="exponential">Exponential (⚡)</option>
            <option value="linear">Linear (📈)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            Min Confidence: <span class="text-cyan-400">{(minConfidence * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            bind:value={minConfidence}
            min="0"
            max="1"
            step="0.1"
            class="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            style="accent-color: #06b6d4"
          />
        </div>
      </div>

      <div class="flex gap-2">
        <button
          on:click={analyze}
          disabled={loading}
          class="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm disabled:opacity-50 transition-all shadow-lg hover:shadow-indigo-500/50 active:scale-95"
        >
          {loading ? '⏳ Analyzing...' : '🚀 Analyze Impact'}
        </button>
      </div>
    </div>

    <!-- Results -->
    {#if error}
      <div class="bg-gradient-to-r from-red-900/40 to-red-800/30 border border-red-600/50 rounded-xl p-6 text-red-300 mb-8">
        <div class="font-semibold mb-2">❌ Error</div>
        <div class="text-sm">{error}</div>
      </div>
    {:else if loading}
      <div class="text-center py-12">
        <div class="inline-flex flex-col items-center gap-3">
          <div class="text-4xl">⏳</div>
          <div class="text-neutral-400">Analyzing impact propagation...</div>
        </div>
      </div>
    {:else if results}
      <!-- Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-600/30 rounded-xl p-6 backdrop-blur-sm">
          <div class="text-xs text-indigo-400 uppercase tracking-wide font-semibold mb-2">Source</div>
          <div class="text-2xl font-bold text-indigo-300">{results.source}</div>
          <div class="text-xs text-neutral-400 mt-2">Starting point</div>
        </div>

        <div class="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-600/30 rounded-xl p-6 backdrop-blur-sm">
          <div class="text-xs text-cyan-400 uppercase tracking-wide font-semibold mb-2">Impacts</div>
          <div class="text-2xl font-bold text-cyan-300">{results.count}</div>
          <div class="text-xs text-neutral-400 mt-2">nodes affected</div>
        </div>

        <div class="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-600/30 rounded-xl p-6 backdrop-blur-sm">
          <div class="text-xs text-emerald-400 uppercase tracking-wide font-semibold mb-2">Avg Impact</div>
          <div class="text-2xl font-bold text-emerald-300">{(results.summary.avg_impact * 100).toFixed(1)}%</div>
          <div class="text-xs text-neutral-400 mt-2">average strength</div>
        </div>
      </div>

      <!-- Results Table -->
      <div class="bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 border border-neutral-700/50 rounded-xl overflow-hidden backdrop-blur-sm">
        <div class="p-6 border-b border-neutral-700/50">
          <h3 class="text-lg font-semibold text-neutral-100">Impact Results</h3>
          <p class="text-xs text-neutral-400 mt-1">Sorted by impact score (highest first)</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-neutral-800/50 border-b border-neutral-700/50">
              <tr>
                <th class="px-6 py-3 text-left font-semibold text-neutral-300">#</th>
                <th class="px-6 py-3 text-left font-semibold text-neutral-300">Target</th>
                <th class="px-6 py-3 text-left font-semibold text-neutral-300">Type</th>
                <th class="px-6 py-3 text-center font-semibold text-neutral-300">Impact Score</th>
                <th class="px-6 py-3 text-center font-semibold text-neutral-300">Depth</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-700/30">
              {#each results.impacts.slice(0, 20) as impact, idx}
                <tr class="hover:bg-neutral-800/30 transition-colors">
                  <td class="px-6 py-4 text-neutral-400">{idx + 1}</td>
                  <td class="px-6 py-4">
                    <div class="font-medium text-neutral-100">{impact.target_name || impact.target_id.slice(0, 12)}...</div>
                    <div class="text-xs text-neutral-500 mt-1">{impact.target_id.slice(0, 8)}...</div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full bg-neutral-800/50 border border-neutral-700/50 text-xs text-neutral-300">
                      {impact.target_type}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <div class={`w-24 h-6 rounded-full bg-gradient-to-r ${getScoreColor(impact.impact_score)} relative overflow-hidden`}>
                      <div class="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                      <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                        {(impact.impact_score * 100).toFixed(0)}%
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span class="px-2.5 py-1 rounded bg-neutral-800/50 border border-neutral-700/50 text-xs text-neutral-300 font-mono">
                      {impact.depth}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if results.impacts.length > 20}
          <div class="p-4 bg-neutral-800/30 border-t border-neutral-700/50 text-center">
            <p class="text-xs text-neutral-400">Showing 20 of {results.impacts.length} results</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

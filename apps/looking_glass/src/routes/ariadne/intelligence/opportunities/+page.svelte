<script lang="ts">
  import { onMount } from 'svelte';

  let loading = false;
  let error: string | null = null;
  let results: any = null;

  let label = 'Company';
  let w_gap = 0.3;
  let w_centrality = 0.4;
  let w_anomaly = 0.3;

  async function analyze() {
    loading = true;
    error = null;
    results = null;

    try {
      const params = new URLSearchParams({
        label,
        w_gap: w_gap.toString(),
        w_centrality: w_centrality.toString(),
        w_anomaly: w_anomaly.toString(),
        limit: '20',
      });

      const response = await fetch(`http://localhost:8082/v1/kg/decision/opportunities?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      results = await response.json();
    } catch (e: any) {
      error = e?.message ?? 'Failed to analyze opportunities';
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

  function getFactorPercent(value: number | null): string {
    if (value === null) return 'N/A';
    return (value * 100).toFixed(1) + '%';
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
        🎯 Opportunity Scoring
      </h1>
      <p class="text-neutral-400">Find high-value nodes based on gaps, centrality, and anomalies</p>
    </div>

    <!-- Controls -->
    <div class="bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 border border-neutral-700/50 rounded-xl p-6 backdrop-blur-sm mb-8">
      <!-- Presets & Label -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Node Label</label>
          <select
            bind:value={label}
            class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700/50 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
          >
            <option value="Company">Company</option>
            <option value="Event">Event</option>
            <option value="Hypothesis">Hypothesis</option>
            <option value="Observation">Observation</option>
          </select>
        </div>
      </div>

      <!-- Weight Sliders -->
      <div class="space-y-4 mb-6 p-4 bg-neutral-800/30 rounded-lg border border-neutral-700/30">
        <h3 class="text-sm font-semibold text-neutral-200 mb-4">Scoring Weights</h3>

        <!-- Gap Weight -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">🕳️ Gap Factor</label>
            <span class="text-sm font-bold text-cyan-400">{(w_gap * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            bind:value={w_gap}
            min="0"
            max="1"
            step="0.05"
            class="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
            style="accent-color: #06b6d4"
          />
          <p class="text-xs text-neutral-500 mt-1">Ratio of low-confidence relations</p>
        </div>

        <!-- Centrality Weight -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">⭐ Centrality Factor</label>
            <span class="text-sm font-bold text-purple-400">{(w_centrality * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            bind:value={w_centrality}
            min="0"
            max="1"
            step="0.05"
            class="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
            style="accent-color: #a855f7"
          />
          <p class="text-xs text-neutral-500 mt-1">PageRank centrality score</p>
        </div>

        <!-- Anomaly Weight -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">🔴 Anomaly Factor</label>
            <span class="text-sm font-bold text-orange-400">{(w_anomaly * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            bind:value={w_anomaly}
            min="0"
            max="1"
            step="0.05"
            class="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
            style="accent-color: #f97316"
          />
          <p class="text-xs text-neutral-500 mt-1">Statistical anomalies detected</p>
        </div>

        <!-- Sum Display -->
        <div class="pt-3 border-t border-neutral-600">
          <div class="flex items-center justify-between">
            <span class="text-xs text-neutral-400">Total Weight</span>
            <span class="text-sm font-bold {(w_gap + w_centrality + w_anomaly - 1) < 0.01 ? 'text-emerald-400' : 'text-amber-400'}">
              {((w_gap + w_centrality + w_anomaly) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div class="flex gap-2">
        <button
          on:click={analyze}
          disabled={loading}
          class="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm disabled:opacity-50 transition-all shadow-lg hover:shadow-indigo-500/50 active:scale-95"
        >
          {loading ? '⏳ Analyzing...' : '🚀 Score Opportunities'}
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
          <div class="text-neutral-400">Analyzing opportunities...</div>
        </div>
      </div>
    {:else if results}
      <!-- Summary -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-600/30 rounded-xl p-6 backdrop-blur-sm">
          <div class="text-xs text-indigo-400 uppercase tracking-wide font-semibold mb-2">Total Nodes</div>
          <div class="text-2xl font-bold text-indigo-300">{results.count}</div>
          <div class="text-xs text-neutral-400 mt-2">{label}</div>
        </div>

        <div class="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-600/30 rounded-xl p-6 backdrop-blur-sm">
          <div class="text-xs text-cyan-400 uppercase tracking-wide font-semibold mb-2">Top Score</div>
          <div class="text-2xl font-bold text-cyan-300">{(results.summary.max_score * 100).toFixed(1)}%</div>
          <div class="text-xs text-neutral-400 mt-2">highest opportunity</div>
        </div>

        <div class="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-600/30 rounded-xl p-6 backdrop-blur-sm">
          <div class="text-xs text-amber-400 uppercase tracking-wide font-semibold mb-2">Avg Score</div>
          <div class="text-2xl font-bold text-amber-300">{(results.summary.avg_score * 100).toFixed(1)}%</div>
          <div class="text-xs text-neutral-400 mt-2">average opportunity</div>
        </div>

        <div class="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-600/30 rounded-xl p-6 backdrop-blur-sm">
          <div class="text-xs text-purple-400 uppercase tracking-wide font-semibold mb-2">Analysis Params</div>
          <div class="text-xs text-neutral-200 mt-2 space-y-1">
            <div>Gap: {(w_gap * 100).toFixed(0)}%</div>
            <div>Centrality: {(w_centrality * 100).toFixed(0)}%</div>
            <div>Anomaly: {(w_anomaly * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      <!-- Results Table -->
      <div class="bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 border border-neutral-700/50 rounded-xl overflow-hidden backdrop-blur-sm">
        <div class="p-6 border-b border-neutral-700/50">
          <h3 class="text-lg font-semibold text-neutral-100">Top Opportunities</h3>
          <p class="text-xs text-neutral-400 mt-1">Ranked by opportunity score</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-neutral-800/50 border-b border-neutral-700/50">
              <tr>
                <th class="px-6 py-3 text-left font-semibold text-neutral-300">#</th>
                <th class="px-6 py-3 text-left font-semibold text-neutral-300">Node</th>
                <th class="px-6 py-3 text-center font-semibold text-neutral-300">Score</th>
                <th class="px-6 py-3 text-center font-semibold text-neutral-300">🕳️ Gap</th>
                <th class="px-6 py-3 text-center font-semibold text-neutral-300">⭐ Centrality</th>
                <th class="px-6 py-3 text-center font-semibold text-neutral-300">🔴 Anomaly</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-700/30">
              {#each results.opportunities.slice(0, 20) as opp, idx}
                <tr class="hover:bg-neutral-800/30 transition-colors">
                  <td class="px-6 py-4 text-neutral-400 font-medium">{idx + 1}</td>
                  <td class="px-6 py-4">
                    <div class="font-medium text-neutral-100">{opp.node_name || opp.node_id.slice(0, 12)}...</div>
                    <div class="text-xs text-neutral-500 mt-1">{opp.node_id.slice(0, 8)}...</div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <div class={`w-20 h-6 rounded-full bg-gradient-to-r ${getScoreColor(opp.opportunity_score)} relative overflow-hidden`}>
                      <div class="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                      <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                        {(opp.opportunity_score * 100).toFixed(0)}%
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <div class="inline-block px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-600/30 text-cyan-300 text-xs font-medium">
                      {getFactorPercent(opp.factors?.gap_severity)}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <div class="inline-block px-2.5 py-1 rounded-full bg-purple-950/40 border border-purple-600/30 text-purple-300 text-xs font-medium">
                      {getFactorPercent(opp.factors?.centrality)}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <div class="inline-block px-2.5 py-1 rounded-full bg-orange-950/40 border border-orange-600/30 text-orange-300 text-xs font-medium">
                      {getFactorPercent(opp.factors?.anomaly)}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if results.opportunities.length > 20}
          <div class="p-4 bg-neutral-800/30 border-t border-neutral-700/50 text-center">
            <p class="text-xs text-neutral-400">Showing 20 of {results.opportunities.length} opportunities</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

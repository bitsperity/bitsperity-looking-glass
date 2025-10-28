<script lang="ts">
  import { onMount } from 'svelte';

  interface RiskProfile {
    ticker: string;
    name: string;
    type: string;
    risk_score: number;
    centrality_factor: number;
    connection_count: number;
    high_risk_relations: number;
  }

  interface LineageChain {
    source: string;
    chain: string[];
    confidence: number;
    evidence: string[];
  }

  let selectedTicker = 'TSLA';
  let includeCentrality = true;
  let maxLineageDepth = 5;

  let loading = false;
  let error: string | null = null;
  let riskProfile: RiskProfile | null = null;
  let lineageChains: LineageChain[] = [];

  async function analyzeRisk() {
    loading = true;
    error = null;
    riskProfile = null;
    lineageChains = [];

    try {
      // Fetch risk score
      const riskResponse = await fetch(
        `http://localhost:8082/v1/kg/decision/risk?ticker=${selectedTicker}&include_centrality=${includeCentrality}`
      );
      
      if (!riskResponse.ok) {
        throw new Error(`Risk API error: ${riskResponse.status}`);
      }

      const riskData = await riskResponse.json();
      if (riskData.status === 'success') {
        riskProfile = riskData.risk_profile;
      }

      // Fetch lineage
      const lineageResponse = await fetch(
        `http://localhost:8082/v1/kg/decision/lineage?ticker=${selectedTicker}&max_depth=${maxLineageDepth}&limit=10`
      );
      
      if (lineageResponse.ok) {
        const lineageData = await lineageResponse.json();
        if (lineageData.status === 'success') {
          lineageChains = lineageData.lineage_chains || [];
        }
      }
    } catch (e: any) {
      error = e.message || 'Failed to analyze risk';
    } finally {
      loading = false;
    }
  }

  function getRiskColor(score: number): string {
    if (score >= 0.8) return 'text-red-500';
    if (score >= 0.6) return 'text-orange-500';
    if (score >= 0.4) return 'text-yellow-500';
    if (score >= 0.2) return 'text-blue-500';
    return 'text-emerald-500';
  }

  function getRiskBg(score: number): string {
    if (score >= 0.8) return 'bg-red-950 border-red-500/30';
    if (score >= 0.6) return 'bg-orange-950 border-orange-500/30';
    if (score >= 0.4) return 'bg-yellow-950 border-yellow-500/30';
    if (score >= 0.2) return 'bg-blue-950 border-blue-500/30';
    return 'bg-emerald-950 border-emerald-500/30';
  }

  function getRiskLabel(score: number): string {
    if (score >= 0.8) return 'CRITICAL';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    if (score >= 0.2) return 'LOW';
    return 'MINIMAL';
  }

  onMount(() => {
    analyzeRisk();
  });
</script>

<div class="space-y-6 pb-12">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="text-3xl font-bold text-neutral-100">⚠️ Risk Scoring & Lineage</h1>
    <p class="text-neutral-400">Analyze risk profiles and trace evidence lineage</p>
  </div>

  <!-- Controls -->
  <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-xl p-6 space-y-4">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <!-- Ticker -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Company Ticker</label>
        <input
          type="text"
          bind:value={selectedTicker}
          placeholder="e.g., TSLA"
          class="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      <!-- Include Centrality -->
      <div class="flex items-end gap-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={includeCentrality}
            class="w-4 h-4 rounded accent-red-500"
          />
          <span class="text-sm font-semibold text-neutral-400">Include Centrality</span>
        </label>
      </div>

      <!-- Max Depth -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Max Lineage Depth: {maxLineageDepth}</label>
        <input
          type="range"
          min="1"
          max="10"
          bind:value={maxLineageDepth}
          class="w-full"
        />
      </div>

      <!-- Analyze Button -->
      <div class="flex items-end">
        <button
          on:click={analyzeRisk}
          disabled={loading}
          class="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-neutral-600 disabled:to-neutral-600 text-white font-medium text-sm transition-all active:scale-95"
        >
          {loading ? '🔄 Analyzing...' : '🚀 Analyze Risk'}
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

  {#if riskProfile}
    <!-- Risk Profile Card -->
    <div class="border rounded-xl p-6 space-y-4 {getRiskBg(riskProfile.risk_score)}">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-2xl font-bold text-neutral-100">{riskProfile.name}</h2>
          <p class="text-sm text-neutral-400 mt-1">{riskProfile.ticker} • {riskProfile.type}</p>
        </div>
        <div class="text-right">
          <div class="text-4xl font-bold {getRiskColor(riskProfile.risk_score)}">
            {Math.round(riskProfile.risk_score * 100)}%
          </div>
          <div class="text-sm font-semibold mt-1 {getRiskColor(riskProfile.risk_score)}">
            {getRiskLabel(riskProfile.risk_score)} RISK
          </div>
        </div>
      </div>

      <!-- Risk Factors -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-700/50">
        <div>
          <div class="text-xs text-neutral-400 font-semibold">Connections</div>
          <div class="text-2xl font-bold text-neutral-100 mt-1">{riskProfile.connection_count}</div>
          <div class="text-xs text-neutral-500 mt-1">related entities</div>
        </div>

        <div>
          <div class="text-xs text-neutral-400 font-semibold">Centrality Factor</div>
          <div class="text-2xl font-bold text-neutral-100 mt-1">
            {Math.round(riskProfile.centrality_factor * 100)}%
          </div>
          <div class="text-xs text-neutral-500 mt-1">network importance</div>
        </div>

        <div>
          <div class="text-xs text-neutral-400 font-semibold">High-Risk Relations</div>
          <div class="text-2xl font-bold text-neutral-100 mt-1">{riskProfile.high_risk_relations}</div>
          <div class="text-xs text-neutral-500 mt-1">low confidence</div>
        </div>
      </div>
    </div>

    <!-- Lineage Chains -->
    {#if lineageChains.length > 0}
      <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-transparent">
          <h3 class="text-sm font-semibold text-neutral-100">Evidence Lineage</h3>
          <p class="text-xs text-neutral-400 mt-1">Top evidence chains supporting risk assessment</p>
        </div>

        <div class="space-y-4 p-6">
          {#each lineageChains as chain}
            <div class="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 space-y-3">
              <!-- Confidence -->
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-neutral-300">Evidence Chain</span>
                <div class="flex items-center gap-2">
                  <div class="w-20 h-2 bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-emerald-500 transition-all"
                      style="width: {chain.confidence * 100}%"
                    />
                  </div>
                  <span class="text-sm font-semibold text-neutral-300">
                    {Math.round(chain.confidence * 100)}%
                  </span>
                </div>
              </div>

              <!-- Path -->
              <div class="text-xs text-neutral-400 font-mono bg-neutral-900 rounded px-3 py-2 overflow-x-auto">
                {chain.chain.join(' → ')}
              </div>

              <!-- Evidence -->
              {#if chain.evidence && chain.evidence.length > 0}
                <div class="space-y-1">
                  <div class="text-xs font-semibold text-neutral-400">Supporting Evidence:</div>
                  <ul class="text-xs text-neutral-300 space-y-1">
                    {#each chain.evidence.slice(0, 2) as ev}
                      <li class="flex items-start gap-2">
                        <span class="text-cyan-400 flex-shrink-0">✓</span>
                        <span class="truncate">{ev}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Loading State -->
  {#if loading}
    <div class="text-center py-12">
      <div class="text-4xl mb-4 animate-spin">🔄</div>
      <div class="text-neutral-400">Analyzing risk profile and lineage...</div>
    </div>
  {/if}

  <!-- Empty State -->
  {#if !loading && !riskProfile && !error}
    <div class="text-center py-12">
      <div class="text-4xl mb-4">⚠️</div>
      <div class="text-neutral-400">Enter a ticker to analyze risk</div>
    </div>
  {/if}
</div>

<style>
  :global(input[type='range']) {
    @apply w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer;
  }

  :global(input[type='range']::-webkit-slider-thumb) {
    @apply appearance-none w-4 h-4 bg-red-500 rounded-full cursor-pointer hover:bg-red-400 transition-colors;
  }

  :global(input[type='range']::-moz-range-thumb) {
    @apply w-4 h-4 bg-red-500 rounded-full cursor-pointer hover:bg-red-400 transition-colors border-0;
  }
</style>

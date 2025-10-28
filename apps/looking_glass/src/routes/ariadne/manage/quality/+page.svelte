<script lang="ts">
  import { onMount } from 'svelte';

  type QualityTab = 'contradictions' | 'gaps' | 'anomalies' | 'duplicates';

  let activeTab: QualityTab = 'contradictions';
  let loading = false;
  let error: string | null = null;

  // Data
  let contradictions: any[] = [];
  let gaps: any[] = [];
  let anomalies: any[] = [];
  let duplicates: any[] = [];

  // Parameters
  let selectedLabel = 'Company';
  let gapThreshold = 0.5;
  let anomalyZThreshold = 2.5;
  let duplicateSimilarity = 0.85;

  // Selected items for bulk actions
  let selectedItems: Set<string> = new Set();

  async function loadQualityData() {
    loading = true;
    error = null;

    try {
      // Load all quality metrics
      const [contRes, gapsRes, anomRes, dupRes] = await Promise.all([
        fetch('http://localhost:8082/v1/kg/quality/contradictions'),
        fetch(`http://localhost:8082/v1/kg/quality/gaps?label=${selectedLabel}`),
        fetch(`http://localhost:8082/v1/kg/quality/anomalies?label=${selectedLabel}&z_threshold=${anomalyZThreshold}`),
        fetch(`http://localhost:8082/v1/kg/quality/duplicates?label=${selectedLabel}&similarity_threshold=${duplicateSimilarity}`),
      ]);

      const [contData, gapsData, anomData, dupData] = await Promise.all([
        contRes.json(),
        gapsRes.json(),
        anomRes.json(),
        dupRes.json(),
      ]);

      contradictions = contData.contradictions || [];
      gaps = gapsData.gaps || [];
      anomalies = anomData.anomalies || [];
      duplicates = dupData.duplicates || [];

      selectedItems.clear();
    } catch (e: any) {
      error = e.message || 'Failed to load quality data';
    } finally {
      loading = false;
    }
  }

  function toggleSelection(id: string) {
    if (selectedItems.has(id)) {
      selectedItems.delete(id);
    } else {
      selectedItems.add(id);
    }
    selectedItems = selectedItems; // Trigger reactivity
  }

  function toggleSelectAll(items: any[]) {
    if (selectedItems.size === items.length) {
      selectedItems.clear();
    } else {
      items.forEach(item => selectedItems.add(item.id || item.node_id || item.source_id));
    }
    selectedItems = selectedItems;
  }

  function getSeverityColor(score: number): string {
    if (score >= 0.8) return 'text-red-500';
    if (score >= 0.6) return 'text-orange-500';
    if (score >= 0.4) return 'text-yellow-500';
    return 'text-emerald-500';
  }

  function getSeverityBg(score: number): string {
    if (score >= 0.8) return 'bg-red-950 border-red-500/30';
    if (score >= 0.6) return 'bg-orange-950 border-orange-500/30';
    if (score >= 0.4) return 'bg-yellow-950 border-yellow-500/30';
    return 'bg-emerald-950 border-emerald-500/30';
  }

  onMount(() => {
    loadQualityData();
  });
</script>

<div class="space-y-6 pb-12">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="text-3xl font-bold text-neutral-100">🔍 Quality Dashboard</h1>
    <p class="text-neutral-400">Monitor and manage data quality issues</p>
  </div>

  <!-- Controls -->
  <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-xl p-6 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Node Label</label>
        <select
          bind:value={selectedLabel}
          class="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="Company">Company</option>
          <option value="Event">Event</option>
          <option value="Observation">Observation</option>
          <option value="Pattern">Pattern</option>
        </select>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Gap Threshold: {(gapThreshold * 100).toFixed(0)}%</label>
        <input type="range" min="0" max="1" step="0.1" bind:value={gapThreshold} class="w-full" />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Anomaly Z-Score: {anomalyZThreshold.toFixed(1)}</label>
        <input type="range" min="1" max="5" step="0.5" bind:value={anomalyZThreshold} class="w-full" />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Duplicate Similarity: {(duplicateSimilarity * 100).toFixed(0)}%</label>
        <input type="range" min="0.7" max="1" step="0.05" bind:value={duplicateSimilarity} class="w-full" />
      </div>
    </div>

    <button
      on:click={loadQualityData}
      disabled={loading}
      class="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-neutral-600 disabled:to-neutral-600 text-white font-medium text-sm transition-all active:scale-95"
    >
      {loading ? '🔄 Scanning...' : '🚀 Scan Quality Issues'}
    </button>
  </div>

  <!-- Error -->
  {#if error}
    <div class="bg-red-950 border border-red-500/30 rounded-lg p-4 text-red-200 text-sm">
      ⚠️ {error}
    </div>
  {/if}

  <!-- Tab Navigation -->
  <div class="flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
    {#each [
      { id: 'contradictions', label: '⚔️ Contradictions', count: contradictions.length },
      { id: 'gaps', label: '🕳️ Gaps', count: gaps.length },
      { id: 'anomalies', label: '🔴 Anomalies', count: anomalies.length },
      { id: 'duplicates', label: '🔀 Duplicates', count: duplicates.length },
    ] as tab}
      <button
        on:click={() => (activeTab = tab.id)}
        class={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
          activeTab === tab.id
            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
        }`}
      >
        {tab.label} <span class="ml-1 text-xs">({tab.count})</span>
      </button>
    {/each}
  </div>

  <!-- Contradictions Tab -->
  {#if activeTab === 'contradictions'}
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-transparent">
        <h3 class="text-sm font-semibold text-neutral-100">Conflicting Information</h3>
        <p class="text-xs text-neutral-400 mt-1">Properties that conflict across relationships</p>
      </div>

      {#if contradictions.length === 0}
        <div class="p-8 text-center text-neutral-400">
          <div class="text-3xl mb-2">✓</div>
          <p>No contradictions found</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-neutral-800/50 border-b border-neutral-700">
              <tr class="text-neutral-400 text-xs font-semibold uppercase">
                <td class="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === contradictions.length}
                    on:change={() => toggleSelectAll(contradictions)}
                    class="w-4 h-4"
                  />
                </td>
                <td class="px-6 py-3">Entity</td>
                <td class="px-6 py-3">Conflicting Property</td>
                <td class="px-6 py-3">Values</td>
              </tr>
            </thead>
            <tbody>
              {#each contradictions as item}
                <tr class="border-b border-neutral-700/50 hover:bg-neutral-800/30">
                  <td class="px-6 py-4">
                    <input type="checkbox" checked={selectedItems.has(item.node_id)} on:change={() => toggleSelection(item.node_id)} class="w-4 h-4" />
                  </td>
                  <td class="px-6 py-4 font-medium text-neutral-200">{item.node_name}</td>
                  <td class="px-6 py-4 text-neutral-300">{item.property}</td>
                  <td class="px-6 py-4 text-xs text-neutral-400">{item.values?.join(' vs ') || 'N/A'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Gaps Tab -->
  {#if activeTab === 'gaps'}
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-transparent">
        <h3 class="text-sm font-semibold text-neutral-100">Coverage Gaps</h3>
        <p class="text-xs text-neutral-400 mt-1">Nodes with high ratio of low-confidence relationships</p>
      </div>

      {#if gaps.length === 0}
        <div class="p-8 text-center text-neutral-400">
          <div class="text-3xl mb-2">✓</div>
          <p>No coverage gaps detected</p>
        </div>
      {:else}
        <div class="space-y-4 p-6">
          {#each gaps as item}
            <div class="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 space-y-2">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="font-medium text-neutral-200">{item.node_name}</h4>
                  <p class="text-xs text-neutral-400 mt-1">{item.low_confidence_count} of {item.total_relations} relations are low-confidence</p>
                </div>
                <div class={`text-right ${getSeverityColor(item.gap_ratio)}`}>
                  <div class="text-lg font-bold">{Math.round(item.gap_ratio * 100)}%</div>
                  <div class="text-xs">gap ratio</div>
                </div>
              </div>
              <div class="w-full h-2 bg-neutral-700 rounded-full overflow-hidden">
                <div class={`h-full ${getSeverityColor(item.gap_ratio).replace('text-', 'bg-')}`} style="width: {item.gap_ratio * 100}%" />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Anomalies Tab -->
  {#if activeTab === 'anomalies'}
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-transparent">
        <h3 class="text-sm font-semibold text-neutral-100">Detected Anomalies</h3>
        <p class="text-xs text-neutral-400 mt-1">Statistical and temporal anomalies</p>
      </div>

      {#if anomalies.length === 0}
        <div class="p-8 text-center text-neutral-400">
          <div class="text-3xl mb-2">✓</div>
          <p>No anomalies detected</p>
        </div>
      {:else}
        <div class="space-y-4 p-6">
          {#each anomalies as item}
            <div class={`border rounded-lg p-4 space-y-2 ${getSeverityBg(item.anomaly_score)}`}>
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-medium text-neutral-100">{item.node_name}</h4>
                  <p class="text-xs text-neutral-300 mt-1">{item.anomaly_type}</p>
                </div>
                <div class={`text-lg font-bold ${getSeverityColor(item.anomaly_score)}`}>
                  {item.anomaly_score.toFixed(2)}
                </div>
              </div>
              {#if item.details}
                <p class="text-xs text-neutral-300 bg-neutral-900/50 rounded px-2 py-1">{item.details}</p>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Duplicates Tab -->
  {#if activeTab === 'duplicates'}
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-transparent">
        <h3 class="text-sm font-semibold text-neutral-100">Potential Duplicates</h3>
        <p class="text-xs text-neutral-400 mt-1">Nodes with high similarity scores</p>
      </div>

      {#if duplicates.length === 0}
        <div class="p-8 text-center text-neutral-400">
          <div class="text-3xl mb-2">✓</div>
          <p>No duplicates detected</p>
        </div>
      {:else}
        <div class="space-y-4 p-6">
          {#each duplicates as item}
            <div class="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <p class="font-medium text-neutral-200">{item.node1_name} ↔ {item.node2_name}</p>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-amber-400">{Math.round(item.similarity * 100)}%</div>
                  <div class="text-xs text-neutral-400">similarity</div>
                </div>
              </div>
              <div class="w-full h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                <div class="h-full bg-amber-500" style="width: {item.similarity * 100}%" />
              </div>
              <div class="flex gap-2 pt-2">
                <button class="flex-1 px-3 py-1 rounded text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all">
                  👁️ Preview
                </button>
                <button class="flex-1 px-3 py-1 rounded text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all">
                  🔀 Merge
                </button>
              </div>
            </div>
          {/each}
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
    @apply appearance-none w-4 h-4 bg-cyan-500 rounded-full cursor-pointer hover:bg-cyan-400 transition-colors;
  }

  :global(input[type='range']::-moz-range-thumb) {
    @apply w-4 h-4 bg-cyan-500 rounded-full cursor-pointer hover:bg-cyan-400 transition-colors border-0;
  }

  :global(.scrollbar-hide) {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  :global(.scrollbar-hide::-webkit-scrollbar) {
    display: none;
  }
</style>

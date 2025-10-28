<script lang="ts">
  import { page } from '$app/stores';

  $: current = $page.url.searchParams.get('view') || 'impact';

  const VIEWS = [
    { id: 'impact', label: '📊 Impact Simulation', desc: 'Propagate impact through the graph' },
    { id: 'opportunities', label: '🎯 Opportunities', desc: 'Find high-value nodes to explore' },
    { id: 'confidence', label: '🔗 Confidence', desc: 'Transitive confidence propagation' },
    { id: 'risk', label: '⚠️ Risk Scoring', desc: 'Calculate risk profiles' },
  ];

  function updateView(viewId: string) {
    window.history.replaceState({}, '', `?view=${viewId}`);
    current = viewId;
  }
</script>

<div class="flex-1 overflow-auto">
  <div class="max-w-7xl mx-auto p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent mb-2">
        Intelligence
      </h1>
      <p class="text-neutral-400">Advanced decision support & knowledge graph analysis</p>
    </div>

    <!-- Sub-Tab Navigation -->
    <div class="flex gap-2 overflow-x-auto mb-8 pb-2 -mb-2 scrollbar-hide">
      {#each VIEWS as view}
        <button
          on:click={() => updateView(view.id)}
          class={`
            px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200
            ${
              current === view.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border border-transparent hover:border-neutral-700'
            }
          `}
        >
          <div>{view.label}</div>
          <div class="text-xs opacity-75 mt-0.5">{view.desc}</div>
        </button>
      {/each}
    </div>

    <!-- Content Area -->
    <div class="bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 border border-neutral-700/50 rounded-xl p-8 backdrop-blur-sm">
      {#if current === 'impact'}
        <div class="text-center py-12">
          <div class="text-2xl font-bold text-neutral-100 mb-3">📊 Impact Simulation</div>
          <p class="text-neutral-400 mb-6">Coming soon - Propagate events through the graph with decay functions</p>
          <div class="inline-flex gap-3">
            <div class="px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-600/30 text-indigo-300 text-sm">
              ⚡ Exponential Decay
            </div>
            <div class="px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-600/30 text-purple-300 text-sm">
              📈 Linear Decay
            </div>
          </div>
        </div>
      {:else if current === 'opportunities'}
        <div class="text-center py-12">
          <div class="text-2xl font-bold text-neutral-100 mb-3">🎯 Opportunity Scoring</div>
          <p class="text-neutral-400 mb-6">Coming soon - Find high-value nodes based on gaps, centrality, and anomalies</p>
          <div class="inline-flex gap-3">
            <div class="px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-300 text-sm">
              🕳️ Gap Detection
            </div>
            <div class="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-600/30 text-cyan-300 text-sm">
              ⭐ Centrality
            </div>
            <div class="px-4 py-2 rounded-lg bg-amber-600/20 border border-amber-600/30 text-amber-300 text-sm">
              🔴 Anomalies
            </div>
          </div>
        </div>
      {:else if current === 'confidence'}
        <div class="text-center py-12">
          <div class="text-2xl font-bold text-neutral-100 mb-3">🔗 Confidence Propagation</div>
          <p class="text-neutral-400 mb-6">Coming soon - Calculate transitive confidence along graph paths</p>
          <div class="inline-flex gap-3">
            <div class="px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-600/30 text-blue-300 text-sm">
              × Product Mode
            </div>
            <div class="px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-600/30 text-indigo-300 text-sm">
              ↓ Min Mode
            </div>
            <div class="px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-600/30 text-purple-300 text-sm">
              ≈ Avg Mode
            </div>
          </div>
        </div>
      {:else if current === 'risk'}
        <div class="text-center py-12">
          <div class="text-2xl font-bold text-neutral-100 mb-3">⚠️ Risk Scoring</div>
          <p class="text-neutral-400 mb-6">Coming soon - Quantify risk for entities based on graph analysis</p>
          <div class="inline-flex gap-3">
            <div class="px-4 py-2 rounded-lg bg-red-600/20 border border-red-600/30 text-red-300 text-sm">
              📊 Risk Metrics
            </div>
            <div class="px-4 py-2 rounded-lg bg-orange-600/20 border border-orange-600/30 text-orange-300 text-sm">
              🔗 Lineage Tracing
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(.scrollbar-hide) {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  :global(.scrollbar-hide::-webkit-scrollbar) {
    display: none;
  }
</style>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  $: current = $page.url.searchParams.get('view') || 'impact';

  const VIEWS = [
    { id: 'impact', label: '📊 Impact Simulation', desc: 'Propagate impact through the graph', route: '/ariadne/intelligence/impact' },
    { id: 'opportunities', label: '🎯 Opportunities', desc: 'Find high-value nodes to explore', route: '/ariadne/intelligence/opportunities' },
    { id: 'confidence', label: '🔗 Confidence', desc: 'Transitive confidence propagation', route: '/ariadne/intelligence/confidence' },
    { id: 'risk', label: '⚠️ Risk Scoring', desc: 'Calculate risk profiles', route: '/ariadne/intelligence/risk' },
  ];

  function updateView(viewId: string) {
    const view = VIEWS.find(v => v.id === viewId);
    if (view) {
      goto(view.route);
    }
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

    <!-- Slot for sub-page content -->
    <slot />
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

<script lang="ts">
  export let workspace: any;
  export let onOpenSearch: (id: string) => void = () => {};
  export let onOpenGraph: (id: string) => void = () => {};

  const typeColors: Record<string, string> = {
    observation: 'bg-blue-500',
    hypothesis: 'bg-amber-500',
    analysis: 'bg-emerald-500',
    decision: 'bg-pink-500',
    reflection: 'bg-purple-500',
    question: 'bg-red-500',
    summary: 'bg-indigo-500',
  };

  function getTypeColor(type: string): string {
    return typeColors[type] || 'bg-gray-500';
  }

  $: typeEntries = Object.entries(workspace.types || {});
  $: totalTypes = typeEntries.reduce((sum, [, count]) => sum + (count as number), 0);
</script>

<div class="backdrop-blur-glass bg-coalescence-glass border border-coalescence-border rounded-xl p-4 hover:border-indigo-500 transition-all hover:shadow-glow">
  <div class="flex items-center justify-between mb-3">
    <div class="flex-1">
      <div class="text-lg font-semibold text-neutral-100">{workspace.workspace_id}</div>
      <div class="text-xs text-neutral-500">{workspace.count} thoughts</div>
    </div>
    <div class="text-indigo-400 font-semibold">{workspace.count}</div>
  </div>
  
  <!-- Type Distribution Bar -->
  {#if typeEntries.length > 0}
    <div class="flex gap-0.5 h-2 mb-4 rounded overflow-hidden bg-neutral-800/50">
      {#each typeEntries as [type, count]}
        <div 
          class={`${getTypeColor(type)} transition-all`}
          style="flex: {count}; min-width: 2px;"
          title={`${type}: ${count}`}
        />
      {/each}
    </div>
  {/if}
  
  <div class="flex gap-2">
    <button 
      class="flex-1 px-3 py-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-xs font-medium text-neutral-200 transition-colors"
      on:click={() => onOpenSearch(workspace.workspace_id)}
    >
      🔍 Search
    </button>
    <button 
      class="flex-1 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
      on:click={() => onOpenGraph(workspace.workspace_id)}
    >
      📊 Graph
    </button>
  </div>
</div>

<style>
  div {
    animation: fadeInSlide 0.3s ease-out;
  }

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>


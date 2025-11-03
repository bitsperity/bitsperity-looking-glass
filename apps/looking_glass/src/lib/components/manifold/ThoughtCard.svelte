<script lang="ts">
  import TypeBadge from './TypeBadge.svelte';
  import StatusBadge from './StatusBadge.svelte';

  export let thought: any;
  export let onOpen: ((id: string) => void) | null = null;
  export let onDelete: ((id: string) => void) | null = null;
  export let onPreview: ((id: string) => void) | null = null;
  export let showActions = true;

  function colorForType(type?: string): string {
    const colors: Record<string, string> = {
      observation: '#10b981',
      hypothesis: '#3b82f6',
      analysis: '#8b5cf6',
      decision: '#f59e0b',
      reflection: '#ec4899',
      question: '#06b6d4',
    };
    return colors[type || 'observation'] || '#6b7280';
  }
</script>

<div class="group bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-5 hover:border-neutral-700 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 flex flex-col h-full">
  <!-- Header: Type Badge & Confidence -->
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-2">
      <div 
        class="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style="background-color: {colorForType(thought.type)}"
      ></div>
      <span class="text-xs font-medium text-neutral-400 uppercase tracking-wide">
        {thought.type || 'unknown'}
      </span>
    </div>
    {#if thought.confidence_score}
      <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-800/50 border border-neutral-700">
        <svg class="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span class="text-xs font-semibold text-neutral-300">
          {Math.round(thought.confidence_score * 100)}%
        </span>
      </div>
    {/if}
  </div>

  <!-- Title -->
  <h3 class="text-lg font-semibold text-neutral-100 mb-2 line-clamp-2 leading-tight group-hover:text-indigo-300 transition-colors">
    {thought.title || 'Untitled Thought'}
  </h3>

  <!-- Summary/Content -->
  <p class="text-sm text-neutral-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
    {thought.summary || thought.content || 'No content available'}
  </p>

  <!-- Tickers -->
  {#if thought.tickers && thought.tickers.length > 0}
    <div class="flex flex-wrap gap-1.5 mb-4">
      {#each thought.tickers.slice(0, 4) as ticker}
        <span class="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-950/30 border border-indigo-800/30 text-xs font-mono font-medium text-indigo-300">
          {ticker}
        </span>
      {/each}
      {#if thought.tickers.length > 4}
        <span class="inline-flex items-center px-2.5 py-1 rounded-md bg-neutral-800/50 text-xs text-neutral-500">
          +{thought.tickers.length - 4}
        </span>
      {/if}
    </div>
  {/if}

  <!-- Metadata Row -->
  <div class="flex items-center gap-2 mb-4 flex-wrap">
    {#if thought.status}
      <StatusBadge status={thought.status} />
    {:else}
      <StatusBadge status="active" />
    {/if}
    {#if thought.workspace_id}
      <a 
        href={`/manifold/workspaces/${encodeURIComponent(thought.workspace_id)}`}
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-950/20 border border-blue-800/20 text-xs text-blue-300 hover:bg-blue-950/30 transition-colors"
        title="Workspace: {thought.workspace_id}"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        {thought.workspace_id.split('-').slice(-1)[0]}
      </a>
    {/if}
    {#if thought.version > 1}
      <span class="inline-flex items-center px-2 py-1 rounded-md bg-amber-950/20 border border-amber-800/20 text-xs text-amber-300">
        v{thought.version}
      </span>
    {/if}
  </div>

  <!-- Actions -->
  {#if showActions}
    <div class="flex gap-2 pt-4 border-t border-neutral-800">
      {#if onOpen}
        <button 
          class="flex-1 px-3 py-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-xs font-medium text-neutral-200 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          on:click={() => onOpen && onOpen(thought.id)}
        >
          Open
        </button>
      {:else}
        <a 
          class="flex-1 px-3 py-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-xs font-medium text-neutral-200 text-center transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          href={`/manifold/thoughts/${thought.id}`}
        >
          Open
        </a>
      {/if}
      {#if onPreview}
        <button 
          class="px-3 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-500/50 text-xs font-medium text-white transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          on:click={() => onPreview && onPreview(thought.id)}
          title="Quick Preview"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      {/if}
      {#if onDelete}
        <button 
          class="px-3 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 border border-red-800/30 hover:border-red-800/50 text-xs font-medium text-red-300 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          on:click={() => onDelete && onDelete(thought.id)}
          title="Delete Thought"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  div {
    animation: fadeInUp 0.3s ease-out;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

<script lang="ts">
  import TypeBadge from './TypeBadge.svelte';
  import StatusBadge from './StatusBadge.svelte';

  export let thought: any;
  export let onOpen: ((id: string) => void) | null = null;
  export let onDelete: ((id: string) => void) | null = null;
  export let onPreview: ((id: string) => void) | null = null;
  export let showActions = true;
</script>

<div class="backdrop-blur-glass bg-coalescence-glass border border-coalescence-border rounded-xl p-4 hover:border-indigo-500 transition-all hover:shadow-glow">
  <!-- Badges Row -->
  <div class="flex items-center gap-2 mb-2 flex-wrap">
    <TypeBadge type={thought.type} />
    <StatusBadge status={thought.status} />
    {#if thought.confidence_score}
      <span class="text-xs bg-indigo-950/50 text-indigo-300 px-2 py-0.5 rounded">
        {Math.round(thought.confidence_score * 100)}%
      </span>
    {/if}
    
    <!-- Children Badge (NEW) -->
    {#if thought.children_count > 0}
      <span class="text-xs bg-emerald-950/50 text-emerald-300 px-2 py-0.5 rounded">
        👶 {thought.children_count}
      </span>
    {/if}
    
    <!-- Version Badge (NEW) -->
    {#if thought.version > 1}
      <span class="text-xs bg-amber-950/50 text-amber-300 px-2 py-0.5 rounded">
        v{thought.version}
      </span>
    {/if}
  </div>

  <!-- Session & Workspace Badges -->
  {#if thought.session_id || thought.workspace_id}
    <div class="flex items-center gap-2 mb-2 flex-wrap">
      {#if thought.session_id}
        <a 
          href={`/manifold/sessions/${encodeURIComponent(thought.session_id)}`}
          class="text-xs bg-purple-950/50 text-purple-300 px-2 py-0.5 rounded hover:bg-purple-900/50 transition-colors"
          title="Session: {thought.session_id}"
        >
          📊 {thought.session_id}
        </a>
      {/if}
      {#if thought.workspace_id}
        <a 
          href={`/manifold/workspaces/${encodeURIComponent(thought.workspace_id)}`}
          class="text-xs bg-blue-950/50 text-blue-300 px-2 py-0.5 rounded hover:bg-blue-900/50 transition-colors"
          title="Workspace: {thought.workspace_id}"
        >
          📁 {thought.workspace_id}
        </a>
      {/if}
    </div>
  {/if}
  
  <!-- Content -->
  <div class="text-base font-semibold text-neutral-100 mb-1">{thought.title}</div>
  <div class="text-xs text-neutral-400 line-clamp-2">{thought.content}</div>
  
  <!-- Tickers -->
  {#if thought.tickers && thought.tickers.length > 0}
    <div class="flex flex-wrap gap-1 mt-2">
      {#each thought.tickers as ticker}
        <span class="text-xs bg-neutral-700/50 text-neutral-300 px-2 py-0.5 rounded font-mono">
          {ticker}
        </span>
      {/each}
    </div>
  {/if}
  
  <!-- Actions -->
  {#if showActions}
    <div class="mt-3 flex gap-2">
      {#if onOpen}
        <button 
          class="flex-1 px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-xs font-medium text-neutral-200 transition-colors"
          on:click={() => onOpen && onOpen(thought.id)}
        >
          Open
        </button>
      {:else}
        <a 
          class="flex-1 px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-xs font-medium text-neutral-200 text-center transition-colors"
          href={`/manifold/thoughts/${thought.id}`}
        >
          Open
        </a>
      {/if}
      {#if onPreview}
        <button 
          class="flex-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
          on:click={() => onPreview && onPreview(thought.id)}
        >
          Preview
        </button>
      {/if}
      {#if onDelete}
        <button 
          class="flex-1 px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-xs font-medium text-white transition-colors"
          on:click={() => onDelete && onDelete(thought.id)}
        >
          Delete
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  div {
    animation: fadeInSlide 0.3s ease-out;
  }

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>


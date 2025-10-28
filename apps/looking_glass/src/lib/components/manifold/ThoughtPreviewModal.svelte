<script lang="ts">
  export let open = false;
  export let thought: any | null = null;
  export let onClose: () => void = () => {};
  export let onOpen: (id: string) => void = () => {};

  function handleClose() {
    onClose();
  }

  function handleOpen() {
    if (thought?.id) {
      onOpen(thought.id);
    }
  }
</script>

{#if open && thought}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
    <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-neutral-900 border border-indigo-500/30 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
      
      <!-- Header -->
      <div class="border-b border-indigo-500/20 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 to-transparent flex-shrink-0">
        <div>
          <h2 class="text-lg font-bold text-neutral-100">{thought.title || 'Untitled'}</h2>
          <div class="flex gap-2 mt-1">
            <span class="text-xs px-2 py-1 rounded bg-indigo-950/50 border border-indigo-500/30 text-indigo-300">
              {thought.type || 'thought'}
            </span>
            <span class="text-xs px-2 py-1 rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
              {thought.status || 'active'}
            </span>
            {#if thought.confidence_level}
              <span class="text-xs px-2 py-1 rounded bg-purple-950/50 border border-purple-500/30 text-purple-300">
                {thought.confidence_level}
              </span>
            {/if}
          </div>
        </div>
        <button
          on:click={handleClose}
          class="text-2xl text-neutral-400 hover:text-neutral-300 transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-auto px-6 py-4 space-y-4">
        <!-- Summary/Content -->
        {#if thought.content}
          <div>
            <div class="text-xs font-semibold text-indigo-400 mb-2">Content</div>
            <div class="text-sm text-neutral-300 bg-neutral-800/50 rounded p-3 leading-relaxed max-h-[25vh] overflow-y-auto whitespace-pre-wrap">
              {thought.content}
            </div>
          </div>
        {/if}

        <!-- Tickers -->
        {#if thought.tickers && thought.tickers.length > 0}
          <div>
            <div class="text-xs font-semibold text-amber-400 mb-2">Tickers</div>
            <div class="flex gap-2 flex-wrap">
              {#each thought.tickers as ticker}
                <span class="px-2 py-1 text-xs rounded bg-amber-950/50 border border-amber-500/30 text-amber-300">
                  {ticker}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Metadata -->
        <div class="text-xs text-neutral-400 space-y-1 pt-2 border-t border-indigo-500/20">
          {#if thought.id}
            <div><span class="text-neutral-500">ID:</span> <code class="text-indigo-300 text-xs">{thought.id.slice(0, 12)}...</code></div>
          {/if}
          {#if thought.created_at}
            <div><span class="text-neutral-500">Created:</span> <span class="text-neutral-300">{new Date(thought.created_at).toLocaleDateString()}</span></div>
          {/if}
          {#if thought.confidence_score}
            <div><span class="text-neutral-500">Confidence:</span> <span class="text-neutral-300">{Math.round(thought.confidence_score * 100)}%</span></div>
          {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-indigo-500/20 bg-neutral-900/80 px-6 py-4 flex gap-3 flex-shrink-0">
        <button
          on:click={handleClose}
          class="flex-1 px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm font-medium text-neutral-200 transition-all"
        >
          Close
        </button>
        <button
          on:click={handleOpen}
          class="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-all shadow-lg hover:shadow-indigo-500/50 active:scale-95"
        >
          Open Full
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) { overflow: auto; }
</style>



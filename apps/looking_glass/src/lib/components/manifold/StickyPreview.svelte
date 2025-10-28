<script lang="ts">
  import { goto } from '$app/navigation';

  export let thought: any | null = null;
  export let isPinned: boolean = false;

  let showSummary = true;

  function togglePin() {
    isPinned = !isPinned;
  }

  function openFullDetail() {
    if (thought?.id) {
      goto(`/manifold/thoughts/${thought.id}`);
    }
  }
</script>

<aside
  class="fixed right-0 top-0 bottom-0 w-96 border-l border-white/10 bg-slate-900/80 backdrop-blur-md transition-all duration-300 z-40"
  style="transform: translateX({!thought && !isPinned ? '100%' : '0'})"
>
  {#if thought}
    <div class="p-4 space-y-4 h-full flex flex-col overflow-auto">
      <!-- Header with title and pin toggle -->
      <div class="flex items-center justify-between pb-3 border-b border-white/10">
        <h3 class="font-semibold text-sm truncate text-neutral-100">{thought.title}</h3>
        <button
          on:click={togglePin}
          class="text-lg hover:opacity-70 transition-opacity flex-shrink-0 ml-2"
          title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
        >
          {#if isPinned}
            📌
          {:else}
            🔓
          {/if}
        </button>
      </div>

      <!-- Tabs: Summary vs Full -->
      <div class="flex gap-2 border-b border-white/10">
        <button
          on:click={() => (showSummary = true)}
          class="px-3 py-2 text-sm font-medium transition-colors {showSummary
            ? 'text-indigo-400 border-b-2 border-indigo-400'
            : 'text-neutral-400 hover:text-neutral-300'}"
        >
          Summary
        </button>
        <button
          on:click={() => (showSummary = false)}
          class="px-3 py-2 text-sm font-medium transition-colors {!showSummary
            ? 'text-indigo-400 border-b-2 border-indigo-400'
            : 'text-neutral-400 hover:text-neutral-300'}"
        >
          Full
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto">
        {#if showSummary}
          <div class="space-y-3">
            {#if thought.type}
              <div class="text-xs">
                <span class="text-neutral-500">Type:</span>
                <span class="text-neutral-300 ml-2 capitalize">{thought.type}</span>
              </div>
            {/if}
            {#if thought.confidence_score}
              <div class="text-xs">
                <span class="text-neutral-500">Confidence:</span>
                <span class="text-indigo-400 ml-2 font-medium">{Math.round(thought.confidence_score * 100)}%</span>
              </div>
            {/if}
            {#if thought.status}
              <div class="text-xs">
                <span class="text-neutral-500">Status:</span>
                <span class="text-neutral-300 ml-2 capitalize">{thought.status}</span>
              </div>
            {/if}
            <p class="text-sm text-neutral-300 leading-relaxed">
              {thought.summary || thought.content || 'No summary available'}
            </p>
          </div>
        {:else}
          <p class="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">
            {thought.content || 'No content available'}
          </p>
        {/if}
      </div>

      <!-- Quick Actions -->
      <div class="flex gap-2 border-t border-white/10 pt-4">
        <button
          on:click={openFullDetail}
          class="flex-1 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-all duration-150 shadow-lg hover:shadow-indigo-500/50 active:scale-95"
        >
          Open Full Detail →
        </button>
      </div>
    </div>
  {/if}
</aside>

<style>
</style>

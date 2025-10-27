<script lang="ts">
  import type { GraphNode } from '$lib/stores/tesseract';

  export let loadingBody: boolean = false;
  export let bodyError: string | null = null;
  export let fullBodyText: string | null = null;
  export let displayNode: GraphNode;
</script>

<div class="absolute top-0 left-0 w-96 h-full bg-gradient-to-br from-neutral-900/95 to-neutral-950/95 backdrop-blur-xl border-r border-neutral-700/30 shadow-2xl overflow-y-auto">
  <div class="p-5">
    <div class="flex items-center gap-3 mb-4 pb-4 border-b border-neutral-700/30">
      <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/30 to-blue-500/20 flex items-center justify-center border border-green-500/40">
        <svg class="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-bold text-neutral-100">Full Article Body</h3>
        <p class="text-xs text-neutral-400">Complete text content</p>
      </div>
    </div>

    {#if loadingBody}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="animate-spin h-8 w-8 text-blue-400 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-neutral-400">Loading article body...</p>
        </div>
      </div>
    {:else if bodyError}
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p class="text-sm font-semibold text-amber-300 mb-1">No Body Available</p>
            <p class="text-xs text-neutral-400">{bodyError}</p>
          </div>
        </div>
      </div>
    {:else if fullBodyText}
      <div class="prose prose-invert prose-sm max-w-none">
        <div class="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
          {fullBodyText}
        </div>
      </div>
    {:else}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-neutral-800/50 to-neutral-900/30 flex items-center justify-center border border-neutral-700/30">
            <svg class="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p class="text-sm text-neutral-400">Hover over a node</p>
          <p class="text-xs text-neutral-500 mt-1">to load full article</p>
        </div>
      </div>
    {/if}
  </div>
</div>

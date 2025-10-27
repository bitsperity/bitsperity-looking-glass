<script lang="ts">
  import type { GraphNode } from '$lib/stores/tesseract';

  export let displayNode: GraphNode | null = null;
  export let isPinned: boolean = false;
  export let onUnpin: () => void = () => {};
</script>

{#if displayNode}
  <div class="absolute top-0 right-0 w-80 h-full bg-gradient-to-br from-neutral-900/95 to-neutral-950/95 backdrop-blur-xl border-l border-neutral-700/30 shadow-2xl overflow-y-auto">
    <!-- Unpin Button (only when pinned) -->
    {#if isPinned}
      <button
        on:click={onUnpin}
        class="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-purple-500/30 hover:bg-purple-500/50 rounded-lg text-purple-200 hover:text-white transition-colors border border-purple-400/50 shadow-lg"
        title="Unpin (Esc)"
      >
        📌
      </button>
    {/if}
    
    <div class="p-5 {isPinned ? 'pr-14' : ''}">
      <!-- Header with Score Badge -->
      <div class="flex items-start gap-4 mb-4 pb-4 border-b border-neutral-700/30">
        <div class="flex-shrink-0 w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/20 flex items-center justify-center border border-blue-500/40">
          <span class="text-base font-bold text-blue-300">{Math.round((displayNode.similarity || 0) * 100)}%</span>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-base font-bold text-neutral-100 leading-tight mb-2">{displayNode.article.title}</h4>
          <div class="flex items-center gap-2 text-xs text-neutral-400">
            <span class="font-medium">{displayNode.article.source_name || displayNode.article.source}</span>
            <span>•</span>
            <span>{new Date(displayNode.article.published_at).toLocaleDateString('de-DE')}</span>
          </div>
        </div>
      </div>
      
      <!-- Full Text Content -->
      <div class="mb-4">
        <p class="text-sm text-neutral-300 leading-relaxed">{displayNode.article.text}</p>
      </div>
      
      <!-- Topics & Tickers (if available) -->
      {#if displayNode.article.topics && displayNode.article.topics.length > 0}
        <div class="mb-3">
          <p class="text-xs font-semibold text-neutral-400 mb-2">Topics:</p>
          <div class="flex flex-wrap gap-1.5">
            {#each displayNode.article.topics.slice(0, 5) as topic}
              <span class="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300">{topic}</span>
            {/each}
          </div>
        </div>
      {/if}
      
      {#if displayNode.article.tickers && displayNode.article.tickers.length > 0}
        <div class="mb-4">
          <p class="text-xs font-semibold text-neutral-400 mb-2">Tickers:</p>
          <div class="flex flex-wrap gap-1.5">
            {#each displayNode.article.tickers.slice(0, 8) as ticker}
              <span class="px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-xs text-green-300 font-mono">{ticker}</span>
            {/each}
          </div>
        </div>
      {/if}
      
      <!-- Actions -->
      <div class="pt-4 border-t border-neutral-700/30 text-xs">
        <p class="text-neutral-500 mb-3">
          💡 <span class="text-blue-300">Click</span> expand • <span class="text-purple-300">Shift+Click</span> pin both
        </p>
        <div class="flex flex-col gap-2">
          <a
            href="/satbase/news?article={displayNode.article.id}"
            class="block px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 text-center transition-colors font-medium"
          >
            📄 View Full Article in Satbase
          </a>
          {#if displayNode.article.url}
            <a
              href={displayNode.article.url}
              target="_blank"
              rel="noopener noreferrer"
              class="block px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm text-blue-300 text-center transition-colors"
            >
              🔗 Open Original Source →
            </a>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}


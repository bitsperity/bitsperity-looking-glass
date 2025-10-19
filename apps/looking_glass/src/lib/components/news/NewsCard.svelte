<script lang="ts">
  import Card from '../shared/Card.svelte';
  import Badge from '../shared/Badge.svelte';
  import type { NewsItem } from '$lib/api/news';
  
  export let item: NewsItem;
  
  let expanded = false;
  let showHtml = false;
  
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  function extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }
  
  function toggleExpanded(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    expanded = !expanded;
  }
  
  function toggleHtmlView(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    showHtml = !showHtml;
  }
</script>

<Card href={item.url} padding="p-0" hover={true}>
  <div class="p-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3 mb-3">
      <div class="flex items-center gap-2 text-xs text-neutral-400">
        <Badge variant="secondary">{item.source}</Badge>
        <span>•</span>
        <span class="font-mono">{extractDomain(item.url)}</span>
        <span>•</span>
        <time>{formatDate(item.published_at)}</time>
      </div>
    </div>
    
    <!-- Title -->
    <h3 class="text-lg font-semibold text-neutral-100 mb-2 leading-snug hover:text-blue-400 transition-colors">
      {item.title}
    </h3>
    
    <!-- Excerpt -->
    {#if item.text}
      <p class="text-sm text-neutral-400 leading-relaxed line-clamp-2 mb-3">
        {item.text}
      </p>
    {/if}
    
    <!-- Body Preview/Full Content -->
    {#if item.content_text || item.content_html}
      <div class="mt-3 pt-3 border-t border-neutral-700/50">
        {#if !expanded}
          <!-- Collapsed Preview -->
          <p class="text-sm text-neutral-300 leading-relaxed line-clamp-3">
            {item.content_text || 'Content available'}
          </p>
          <button 
            on:click={toggleExpanded}
            class="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
          >
            <span>Read full article</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        {:else}
          <!-- Expanded Full Content -->
          <div class="space-y-3">
            <!-- Toggle between Plain Text and HTML -->
            {#if item.content_html}
              <div class="flex items-center gap-2 mb-2">
                <button
                  on:click={toggleHtmlView}
                  class="text-xs px-2 py-1 rounded {showHtml ? 'bg-neutral-700 text-neutral-300' : 'bg-blue-600 text-white'} font-medium transition-colors"
                >
                  Plain Text
                </button>
                <button
                  on:click={toggleHtmlView}
                  class="text-xs px-2 py-1 rounded {showHtml ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-300'} font-medium transition-colors"
                >
                  HTML
                </button>
              </div>
            {/if}
            
            {#if showHtml && item.content_html}
              <!-- HTML View (Rendered) -->
              <div class="prose prose-invert prose-sm max-w-none bg-neutral-900/50 rounded-lg p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
                {@html item.content_html}
              </div>
            {:else if item.content_text}
              <!-- Plain Text View -->
              <div class="text-sm text-neutral-300 leading-relaxed bg-neutral-900/50 rounded-lg p-4 whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {item.content_text}
              </div>
            {/if}
            
            <button 
              on:click={toggleExpanded}
              class="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
            >
              <span>Show less</span>
              <svg class="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        {/if}
      </div>
    {/if}
    
    <!-- Footer -->
    {#if item.tickers && item.tickers.length > 0}
      <div class="flex flex-wrap gap-1.5 mt-4">
        {#each item.tickers as ticker}
          <Badge variant="primary" size="sm">{ticker}</Badge>
        {/each}
      </div>
    {/if}
  </div>
</Card>


<script lang="ts">
  import Card from '../shared/Card.svelte';
  import Badge from '../shared/Badge.svelte';
  import type { NewsItem } from '$lib/api/news';
  
  export let item: NewsItem;
  
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
    
    <!-- Body Preview -->
    {#if item.content_text}
      <div class="mt-3 pt-3 border-t border-neutral-700/50">
        <p class="text-sm text-neutral-300 leading-relaxed line-clamp-3">
          {item.content_text}
        </p>
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


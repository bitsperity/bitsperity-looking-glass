<script lang="ts">
  import { onMount } from 'svelte';
  import { getWatchlist, postWatchlist, deleteWatchlist, getTopics, postTopics, deleteTopic, type WatchlistItem, type NewsTopic } from '$lib/api/watchlist';
  import Card from '$lib/components/shared/Card.svelte';
  import Button from '$lib/components/shared/Button.svelte';
  import Input from '$lib/components/shared/Input.svelte';
  import Badge from '$lib/components/shared/Badge.svelte';
  
  let watchlist: WatchlistItem[] = [];
  let topics: NewsTopic[] = [];
  
  // Watchlist state
  let newSymbols: string = '';
  let watchlistTtl: number = 365;
  let watchlistIngest: boolean = true;
  let watchlistLoading: boolean = false;
  let watchlistError: string | null = null;
  let searchSymbol: string = '';
  
  // Topics state
  let newTopic: string = '';
  let topicTtl: number = 7;
  let topicIngest: boolean = true;
  let topicsLoading: boolean = false;
  let topicsError: string | null = null;
  let searchTopic: string = '';
  
  async function loadData() {
    try {
      [watchlist, topics] = await Promise.all([
        getWatchlist(),
        getTopics()
      ]);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  }
  
  async function handleAddSymbols() {
    if (!newSymbols.trim()) return;
    
    watchlistLoading = true;
    watchlistError = null;
    
    try {
      const symbols = newSymbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
      if (symbols.length === 0) return;
      
      await postWatchlist({ 
        symbols, 
        ttl_days: watchlistTtl, 
        ingest: watchlistIngest 
      });
      
      newSymbols = '';
      await loadData();
    } catch (e: any) {
      watchlistError = e?.body?.error || e?.message || String(e);
    } finally {
      watchlistLoading = false;
    }
  }
  
  async function handleRemoveSymbol(symbol: string) {
    if (!confirm(`Remove ${symbol} from watchlist?`)) return;
    
    try {
      await deleteWatchlist(symbol);
      await loadData();
    } catch (e) {
      watchlistError = String(e);
    }
  }
  
  async function handleAddTopic() {
    if (!newTopic.trim()) return;
    
    topicsLoading = true;
    topicsError = null;
    
    try {
      await postTopics({ 
        queries: [newTopic.trim()], 
        ttl_days: topicTtl,
        ingest: topicIngest 
      });
      newTopic = '';
      await loadData();
    } catch (e: any) {
      topicsError = e?.body?.error || e?.message || String(e);
    } finally {
      topicsLoading = false;
    }
  }
  
  async function handleRemoveTopic(query: string) {
    if (!confirm(`Remove topic "${query}"?`)) return;
    
    try {
      await deleteTopic(query);
      await loadData();
    } catch (e) {
      topicsError = String(e);
    }
  }
  
  function formatDate(isoString: string | null | undefined): string {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('de-DE', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Invalid date';
    }
  }
  
  function isExpired(expiresAt: string | null | undefined): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }
  
  function daysUntilExpiry(expiresAt: string | null | undefined): number {
    if (!expiresAt) return Infinity;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  onMount(loadData);
  
  // Filtered lists
  $: filteredWatchlist = watchlist.filter(item => 
    item.symbol.toLowerCase().includes(searchSymbol.toLowerCase())
  );
  
  $: filteredTopics = topics.filter(topic => 
    topic.query.toLowerCase().includes(searchTopic.toLowerCase())
  );
  
  $: totalSymbols = watchlist.length;
  $: totalTopics = topics.length;
</script>

<div class="max-w-6xl mx-auto space-y-6 h-full overflow-y-auto p-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-neutral-100">Watchlist & Topics</h1>
      <p class="text-sm text-neutral-400 mt-1">Manage tracked symbols and news queries</p>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="primary">{totalSymbols} symbols</Badge>
      <Badge variant="secondary">{totalTopics} topics</Badge>
    </div>
  </div>
  
  <!-- Stock Watchlist Section -->
  <Card>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-neutral-100">Stock Watchlist</h2>
        <div class="flex items-center gap-2">
          <Input 
            placeholder="Search symbols..." 
            bind:value={searchSymbol}
            classes="w-48"
          />
        </div>
      </div>
      
      <!-- Add Symbols Form -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-neutral-900/50 rounded-lg border border-neutral-700/30">
        <div class="md:col-span-5">
          <Input 
            label="Symbols (comma-separated)"
            placeholder="AAPL, MSFT, TSLA"
            bind:value={newSymbols}
            disabled={watchlistLoading}
          />
        </div>
        <div class="md:col-span-2">
          <Input 
            label="TTL (days)"
            type="number"
            bind:value={watchlistTtl}
            disabled={watchlistLoading}
          />
        </div>
        <div class="md:col-span-2 flex items-end">
          <label class="flex items-center gap-2 text-sm cursor-pointer h-10">
            <input 
              type="checkbox" 
              bind:checked={watchlistIngest} 
              disabled={watchlistLoading}
              class="rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50" 
            />
            <span class="text-neutral-300">Auto-ingest</span>
          </label>
        </div>
        <div class="md:col-span-3 flex items-end">
          <Button 
            variant="primary" 
            size="md" 
            on:click={handleAddSymbols}
            loading={watchlistLoading}
            disabled={!newSymbols.trim()}
            classes="w-full"
          >
            {watchlistLoading ? 'Adding...' : 'Add Symbols'}
          </Button>
        </div>
      </div>
      
      <!-- Error Message -->
      {#if watchlistError}
        <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-300">
          {watchlistError}
        </div>
      {/if}
      
      <!-- Watchlist Items -->
      <div class="space-y-2">
        {#if filteredWatchlist.length === 0}
          <div class="text-center py-12 text-neutral-500">
            <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-sm">No symbols in watchlist</p>
            <p class="text-xs text-neutral-600 mt-1">Add symbols above to start tracking</p>
          </div>
        {:else}
          {#each filteredWatchlist as item}
            <div class="flex items-center justify-between p-3 bg-neutral-800/50 hover:bg-neutral-800/70 rounded-lg border border-neutral-700/30 transition-all group">
              <div class="flex items-center gap-3 flex-1">
                <a 
                  href="/satbase/prices?ticker={item.symbol}" 
                  class="text-lg font-semibold font-mono text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {item.symbol}
                </a>
                <div class="flex items-center gap-2 text-xs text-neutral-500">
                  <span>Added: {formatDate(item.added_at)}</span>
                  {#if item.expires_at}
                    {#if isExpired(item.expires_at)}
                      <Badge variant="danger" size="sm">Expired</Badge>
                    {:else}
                      <span>· Expires: {formatDate(item.expires_at)}</span>
                      {#if daysUntilExpiry(item.expires_at) <= 7}
                        <Badge variant="warning" size="sm">{daysUntilExpiry(item.expires_at)}d left</Badge>
                      {/if}
                    {/if}
                  {/if}
                </div>
              </div>
              <Button 
                variant="danger" 
                size="sm" 
                on:click={() => handleRemoveSymbol(item.symbol)}
                classes="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Remove
              </Button>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </Card>
  
  <!-- News Topics Section -->
  <Card>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-neutral-100">News Topics</h2>
        <div class="flex items-center gap-2">
          <Input 
            placeholder="Search topics..." 
            bind:value={searchTopic}
            classes="w-48"
          />
        </div>
      </div>
      
      <!-- Add Topic Form -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-neutral-900/50 rounded-lg border border-neutral-700/30">
        <div class="md:col-span-5">
          <Input 
            label="Search Query"
            placeholder="e.g., semiconductor, AI, renewable energy"
            bind:value={newTopic}
            disabled={topicsLoading}
          />
        </div>
        <div class="md:col-span-2">
          <Input 
            label="TTL (days)"
            type="number"
            bind:value={topicTtl}
            disabled={topicsLoading}
          />
        </div>
        <div class="md:col-span-2 flex items-end">
          <label class="flex items-center gap-2 text-sm cursor-pointer h-10">
            <input 
              type="checkbox" 
              bind:checked={topicIngest} 
              disabled={topicsLoading}
              class="rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50" 
            />
            <span class="text-neutral-300">Auto-ingest</span>
          </label>
        </div>
        <div class="md:col-span-3 flex items-end">
          <Button 
            variant="primary" 
            size="md" 
            on:click={handleAddTopic}
            loading={topicsLoading}
            disabled={!newTopic.trim()}
            classes="w-full"
          >
            {topicsLoading ? 'Adding...' : 'Add Topic'}
          </Button>
        </div>
      </div>
      
      <!-- Error Message -->
      {#if topicsError}
        <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-300">
          {topicsError}
        </div>
      {/if}
      
      <!-- Topics List -->
      <div class="space-y-2">
        {#if filteredTopics.length === 0}
          <div class="text-center py-12 text-neutral-500">
            <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p class="text-sm">No news topics tracked</p>
            <p class="text-xs text-neutral-600 mt-1">Add topics above to track relevant news</p>
          </div>
        {:else}
          {#each filteredTopics as topic}
            <div class="flex items-center justify-between p-3 bg-neutral-800/50 hover:bg-neutral-800/70 rounded-lg border border-neutral-700/30 transition-all group">
              <div class="flex items-center gap-3 flex-1">
                <a 
                  href="/satbase/news?q={encodeURIComponent(topic.query)}" 
                  class="text-base font-medium text-neutral-100 hover:text-blue-400 transition-colors"
                >
                  {topic.query}
                </a>
                <div class="flex items-center gap-2 text-xs text-neutral-500">
                  <span>Added: {formatDate(topic.added_at)}</span>
                  {#if topic.expires_at}
                    {#if isExpired(topic.expires_at)}
                      <Badge variant="danger" size="sm">Expired</Badge>
                    {:else}
                      <span>· Expires: {formatDate(topic.expires_at)}</span>
                      {#if daysUntilExpiry(topic.expires_at) <= 3}
                        <Badge variant="warning" size="sm">{daysUntilExpiry(topic.expires_at)}d left</Badge>
                      {/if}
                    {/if}
                  {/if}
                </div>
              </div>
              <Button 
                variant="danger" 
                size="sm" 
                on:click={() => handleRemoveTopic(topic.query)}
                classes="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Remove
              </Button>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </Card>
</div>


<script lang="ts">
  import { semanticSearch, type SearchResult } from '$lib/api/tesseract';
  import NewsCard from '$lib/components/news/NewsCard.svelte';
  import Input from '$lib/components/shared/Input.svelte';
  import Button from '$lib/components/shared/Button.svelte';
  import Badge from '$lib/components/shared/Badge.svelte';
  
  let query = '';
  let results: SearchResult[] = [];
  let loading = false;
  let error: string | null = null;
  
  // Filters
  let tickers = '';
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  let from = monthAgo;
  let to = today;
  
  async function search() {
    if (!query.trim()) return;
    
    loading = true;
    error = null;
    
    try {
      const filters: any = {};
      if (tickers.trim()) {
        filters.tickers = tickers.split(',').map(t => t.trim().toUpperCase());
      }
      if (from) filters.from = from;
      if (to) filters.to = to;
      
      const response = await semanticSearch(query, filters, 50);
      results = response.results;
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') search();
  }
</script>

<div class="h-screen flex flex-col overflow-hidden">
  <!-- Header -->
  <div class="flex-shrink-0 max-w-6xl w-full mx-auto px-6 pt-6 pb-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-100">Tesseract</h1>
        <p class="text-sm text-neutral-400 mt-1">Semantic Intelligence Layer</p>
      </div>
      {#if results.length > 0}
        <Badge variant="success">{results.length} results</Badge>
      {/if}
    </div>
  </div>
  
  <!-- Search Bar -->
  <div class="flex-shrink-0 max-w-6xl w-full mx-auto px-6 pb-4">
    <div class="bg-neutral-800/30 border border-neutral-700/50 rounded-xl p-5 space-y-4">
      <div class="relative">
        <input
          type="text"
          bind:value={query}
          on:keydown={handleKeydown}
          placeholder="What are you looking for? (e.g., 'semiconductor supply chain constraints')"
          class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-4 py-3 pr-24 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <Button
          variant="primary"
          size="sm"
          on:click={search}
          loading={loading}
          classes="absolute right-2 top-2"
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Tickers (optional)" placeholder="NVDA, AMD, TSM" bind:value={tickers} />
        <Input label="From" type="date" bind:value={from} max={today} />
        <Input label="To" type="date" bind:value={to} max={today} />
      </div>
    </div>
  </div>
  
  <!-- Results -->
  <div class="flex-1 overflow-y-auto max-w-6xl w-full mx-auto px-6 pb-6">
    {#if error}
      <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-400 mb-4">
        {error}
      </div>
    {/if}
    
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="flex flex-col items-center gap-3">
          <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-neutral-400">Searching semantic space...</p>
        </div>
      </div>
    {/if}
    
    {#if !loading && results.length > 0}
      <div class="grid gap-4">
        {#each results as result}
          <div class="relative">
            <div class="absolute top-4 right-4 z-10">
              <Badge variant="primary" size="sm">
                {(result.score * 100).toFixed(0)}% match
              </Badge>
            </div>
            <NewsCard item={result} />
          </div>
        {/each}
      </div>
    {:else if !loading && query && results.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <svg class="w-16 h-16 text-neutral-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="text-lg font-semibold text-neutral-300 mb-1">No results found</h3>
        <p class="text-sm text-neutral-500">Try adjusting your query or filters</p>
      </div>
    {:else if !loading && !query}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <svg class="w-16 h-16 text-neutral-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-lg font-semibold text-neutral-300 mb-1">Start your search</h3>
        <p class="text-sm text-neutral-500">Enter a natural language query to find relevant news</p>
      </div>
    {/if}
  </div>
</div>


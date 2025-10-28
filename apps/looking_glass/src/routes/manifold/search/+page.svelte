<script lang="ts">
  import { onMount } from 'svelte';
  import { timeline as apiTimeline } from '$lib/api/manifold';
  import { bulkActions } from '$lib/services/manifoldService';
  import ThoughtCard from '$lib/components/manifold/ThoughtCard.svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import SearchControls from '$lib/components/manifold/SearchControls.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  import ThoughtPreviewModal from '$lib/components/manifold/ThoughtPreviewModal.svelte';
  import * as api from '$lib/api/manifold';
  import { page } from '$app/stores';

  let q = '';
  let vectorType: 'summary' | 'text' | 'title' = 'summary';
  let cheapMode = false;
  let sessionId: string = '';
  let workspaceId: string = '';
  let results: any[] = [];
  let facets: Record<string, any[]> = {};
  let activeFilters: { key: string; value: string }[] = [];
  let selected: Record<string, boolean> = {};
  let miniBuckets: { date: string; count: number }[] = [];
  let previewId: string | null = null;
  let selectedResultId: string | null = null;
  let loading = false;
  let error: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function doSearch() {
    loading = true;
    error = null;
    results = [];
    selected = {};
    
    try {
      const mustFilters = [
        ...activeFilters.map(f => ({ key: f.key, match: { value: f.value } })),
        ...(sessionId ? [{ key: 'session_id', match: { value: sessionId } }] : []),
        ...(workspaceId ? [{ key: 'workspace_id', match: { value: workspaceId } }] : []),
      ];

      const resp = await api.searchV2({
        query: q,
        vector_type: vectorType,
        include_content: !cheapMode,
        filters: { must: mustFilters.length > 0 ? mustFilters : undefined },
        limit: 50,
      });

      results = resp.results || [];
      for (const r of results) selected[r.id] = false;

      // Load timeline
      const type = activeFilters.find(f => f.key === 'type')?.value;
      const tickerVals = activeFilters.filter(f => f.key === 'tickers').map(f => f.value);
      const tl = await apiTimeline({ type, tickers: tickerVals.join(',') });
      const bucketObj = tl.bucketed || {};
      const entries = Object.entries(bucketObj).map(([date, arr]: any) => ({ date, count: (arr || []).length }));
      entries.sort((a, b) => a.date.localeCompare(b.date));
      miniBuckets = entries.slice(-14);
    } catch (e: any) {
      error = e?.message ?? 'Error searching';
    } finally {
      loading = false;
    }
  }

  function handleInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(), 400);
  }

  function addFilter(key: string, value: string) {
    if (!activeFilters.find(f => f.key === key && f.value === value)) {
      activeFilters = [...activeFilters, { key, value }];
      doSearch();
    }
  }

  function removeFilter(idx: number) {
    activeFilters = activeFilters.filter((_, i) => i !== idx);
    doSearch();
  }

  function selectedIds(): string[] {
    return Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
  }

  async function runBulk(action: 'quarantine' | 'unquarantine' | 'reembed' | 'promote') {
    const ids = selectedIds();
    if (ids.length === 0) return;
    await bulkActions(action, ids);
    await doSearch();
  }

  function onSelectAllChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const checked = !!(target && target.checked);
    for (const id in selected) selected[id] = checked;
  }

  function onRowSelectedChange(id: string, e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    selected[id] = !!(target && target.checked);
  }

  onMount(() => {
    // Read query params
    const params = new URLSearchParams($page.url.search);
    sessionId = params.get('session_id') || '';
    q = params.get('q') || '';
    doSearch();
  });

  $: selectedResult = results.find(r => r.id === selectedResultId);
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
    Manifold · Search
  </h1>
  <ManifoldNav />

  <!-- Query Input -->
  <div class="flex gap-2">
    <input 
      class="px-4 py-2 rounded bg-neutral-800 border border-neutral-700 w-full text-neutral-200 placeholder-neutral-500 hover:border-indigo-500 transition-colors focus:outline-none focus:border-indigo-500"
      placeholder="Search thoughts… (type to search)" 
      bind:value={q} 
      on:input={handleInput}
      on:keydown={(e) => e.key === 'Enter' && doSearch()} 
    />
    <button 
      class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
      on:click={doSearch}
      disabled={loading}
    >
      {loading ? '...' : 'Search'}
    </button>
  </div>

  <!-- Search Controls (vector_type, cheap mode, session filter) -->
  <SearchControls 
    bind:vectorType
    bind:cheapMode
    bind:sessionId
    bind:workspaceId
    onVectorTypeChange={doSearch}
    onCheapModeChange={doSearch}
    onSessionChange={doSearch}
    onWorkspaceChange={doSearch}
  />

  <!-- Active Filters -->
  {#if activeFilters.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each activeFilters as f, i}
        <span class="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-200 flex items-center gap-1">
          {f.key}:{f.value}
          <button class="text-neutral-400 hover:text-neutral-200 ml-1" on:click={() => removeFilter(i)}>×</button>
        </span>
      {/each}
      <button 
        class="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-300 transition-colors"
        on:click={() => { activeFilters = []; doSearch(); }}
      >
        Clear all
      </button>
    </div>
  {/if}

  <!-- Main Content -->
  {#if loading}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <GlassPanel title="🔍 Results" loading={true} />
      </div>
      <GlassPanel title="🏷️ Facets" loading={true} />
    </div>
  {:else if error}
    <GlassPanel error={error} title="❌ Search Error" />
  {:else if results.length === 0}
    <GlassPanel title="🔍 Results" emptyMessage="No results found. Try a different search." />
  {/if}

  {#if !loading && !error && results.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Left: Facets -->
      <aside class="md:col-span-1 space-y-3">
        <GlassPanel title="🏷️ Facets">
          <div class="space-y-3">
            {#each Object.entries(facets) as [k, items] (k)}
              <div>
                <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">{k}</div>
                <div class="flex flex-wrap gap-1">
                  {#each items as it (it.value)}
                    <button 
                      class="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-300 transition-colors"
                      on:click={() => addFilter(k, it.value)}
                    >
                      {it.value} ({it.count})
                    </button>
                  {/each}
                </div>
              </div>
            {/each}

            <!-- Timeline -->
            <div>
              <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Timeline (14d)</div>
              <div class="flex items-end gap-1 h-16">
                {#each miniBuckets as b (b.date)}
                  <div 
                    class="flex-1 bg-indigo-500 hover:bg-indigo-400 rounded-t transition-colors cursor-pointer"
                    style={`height:${Math.max(2, Math.min(60, b.count * 4))}px`}
                    title={`${b.date}: ${b.count}`}
                  />
                {/each}
              </div>
            </div>
          </div>
        </GlassPanel>
      </aside>

      <!-- Center: Results List -->
      <section class="md:col-span-2">
        <!-- Bulk Actions Bar -->
        <div class="mb-3 flex items-center gap-2 text-xs">
          <label class="flex items-center gap-1">
            <input type="checkbox" on:change={onSelectAllChange} />
            <span>Select all</span>
          </label>
          <button 
            class="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded disabled:opacity-50"
            on:click={() => runBulk('quarantine')}
            disabled={selectedIds().length === 0}
          >
            Quarantine
          </button>
          <button 
            class="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded disabled:opacity-50"
            on:click={() => runBulk('promote')}
            disabled={selectedIds().length === 0}
          >
            Promote
          </button>
        </div>

        <!-- Results -->
        <div class="text-sm text-neutral-400 mb-2">{results.length} results</div>
        <div class="space-y-2">
          {#each results as r (r.id)}
            <div 
              class="bg-neutral-900 rounded p-3 border border-neutral-800 hover:border-indigo-500 transition-colors cursor-pointer"
              on:click={() => selectedResultId = r.id}
              class:border-indigo-500={selectedResultId === r.id}
            >
              <div class="flex items-start gap-2">
                <input 
                  type="checkbox" 
                  checked={!!selected[r.id]} 
                  on:change={(e) => onRowSelectedChange(r.id, e)}
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-medium text-indigo-400">{r.thought?.type}</span>
                    <span class="text-xs text-neutral-500">{r.thought?.status}</span>
                  </div>
                  <div class="font-semibold text-neutral-100 truncate">{r.thought?.title}</div>
                  {#if !cheapMode && r.thought?.summary}
                    <div class="text-xs text-neutral-400 truncate mt-1">{r.thought.summary}</div>
                  {/if}
                  <div class="text-xs text-neutral-500 mt-1">
                    Score: {(r.score * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Right: Sticky Preview (sticky) -->
      {#if selectedResult}
        <aside class="md:col-span-1">
          <div class="sticky top-6">
            <GlassPanel title="👁️ Preview">
              <div class="space-y-3">
                <div>
                  <div class="text-xs font-medium text-neutral-400 mb-1">Type</div>
                  <div class="text-sm text-neutral-200">{selectedResult.thought?.type}</div>
                </div>

                <div>
                  <div class="text-xs font-medium text-neutral-400 mb-1">Title</div>
                  <div class="text-sm font-semibold text-neutral-100">{selectedResult.thought?.title}</div>
                </div>

                {#if selectedResult.thought?.summary}
                  <div>
                    <div class="text-xs font-medium text-neutral-400 mb-1">Summary</div>
                    <div class="text-xs text-neutral-300 line-clamp-4">
                      {selectedResult.thought.summary}
                    </div>
                  </div>
                {/if}

                {#if selectedResult.thought?.tickers?.length}
                  <div>
                    <div class="text-xs font-medium text-neutral-400 mb-1">Tickers</div>
                    <div class="flex flex-wrap gap-1">
                      {#each selectedResult.thought.tickers as ticker}
                        <span class="text-xs bg-indigo-950/50 text-indigo-300 rounded px-2 py-0.5">{ticker}</span>
                      {/each}
                    </div>
                  </div>
                {/if}

                <div class="flex gap-2 pt-2">
                  <a 
                    class="flex-1 px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-xs text-center text-neutral-200 transition-colors"
                    href={`/manifold/thoughts/${selectedResult.id}`}
                  >
                    Open
                  </a>
                  <button
                    class="flex-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white transition-colors"
                    on:click={() => { previewId = selectedResult.id; }}
                  >
                    Preview
                  </button>
                </div>
              </div>
            </GlassPanel>
          </div>
        </aside>
      {/if}
    </div>
  {/if}
</div>

<ThoughtPreviewModal thoughtId={previewId} onClose={() => { previewId = null; }} />



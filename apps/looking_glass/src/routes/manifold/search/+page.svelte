<script lang="ts">
  import { onMount } from 'svelte';
  import { runSearch } from '$lib/services/manifoldService';
  import { timeline as apiTimeline } from '$lib/api/manifold';
  import { bulkActions } from '$lib/services/manifoldService';
  import ThoughtCard from '$lib/components/manifold/ThoughtCard.svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import ThoughtPreviewModal from '$lib/components/manifold/ThoughtPreviewModal.svelte';

  let q = '';
  let results: any[] = [];
  let facets: Record<string, any[]> = {};
  let facetSuggest: Record<string, any[]> = {};
  let activeFilters: { key: string; value: string }[] = [];
  let selected: Record<string, boolean> = {};
  let miniBuckets: { date: string; count: number }[] = [];
  let previewId: string | null = null;
  let loading = false;
  let error: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function doSearch() {
    loading = true; error = null; results = [];
    try {
      const filters = {
        must: activeFilters.map(f => ({ key: f.key, match: { value: f.value } }))
      };
      const resp = await runSearch({ query: q, facets: ['type', 'tickers', 'status', 'sectors'], filters, limit: 50 });
      results = resp.results || [];
      facets = resp.facets || {};
      facetSuggest = resp.facet_suggest || {};
      // reset selection
      selected = {};
      for (const r of results) selected[r.id] = false;
      // load mini timeline based on filters
      const type = activeFilters.find(f => f.key==='type')?.value;
      const tickerVals = activeFilters.filter(f => f.key==='tickers').map(f => f.value);
      const tl = await apiTimeline({ type, tickers: tickerVals.join(',') });
      const bucketObj = tl.bucketed || {};
      const entries = Object.entries(bucketObj).map(([date, arr]: any) => ({ date, count: (arr||[]).length }));
      entries.sort((a,b) => a.date.localeCompare(b.date));
      miniBuckets = entries.slice(-14);
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  }

  function handleInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(), 400);
  }

  function addFilter(key: string, value: string) {
    if (!activeFilters.find(f => f.key===key && f.value===value)) {
      activeFilters = [...activeFilters, { key, value }];
      doSearch();
    }
  }
  function removeFilter(idx: number) {
    activeFilters = activeFilters.filter((_, i) => i!==idx);
    doSearch();
  }

  function selectedIds(): string[] {
    return Object.entries(selected).filter(([,v]) => v).map(([k]) => k);
  }
  async function runBulk(action: 'quarantine'|'unquarantine'|'reembed'|'promote') {
    const ids = selectedIds();
    if (ids.length===0) return;
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

  onMount(() => { doSearch(); });
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Manifold · Search</h1>
  <ManifoldNav />

  <div class="flex gap-2">
    <input 
      class="px-3 py-2 rounded bg-neutral-800 w-full" 
      placeholder="Search thoughts… (type to search, Enter to force)" 
      bind:value={q} 
      on:input={handleInput}
      on:keydown={(e) => e.key==='Enter' && doSearch()} 
    />
    <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" on:click={doSearch}>Search</button>
  </div>

  {#if activeFilters.length > 0}
    <div class="flex flex-wrap gap-2 text-xs">
      {#each activeFilters as f, i}
        <span class="px-2 py-1 bg-neutral-800 rounded">
          {f.key}:{f.value}
          <button class="ml-1 text-neutral-400 hover:text-neutral-200" on:click={() => removeFilter(i)}>×</button>
        </span>
      {/each}
      <button class="px-2 py-1 bg-neutral-900 rounded hover:bg-neutral-800" on:click={() => { activeFilters=[]; doSearch(); }}>Clear all</button>
    </div>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <aside class="md:col-span-1 space-y-3">
      <div class="text-sm text-neutral-400">Facets</div>
      {#each Object.entries(facets) as [k, items]}
        <div>
          <div class="text-xs text-neutral-500 uppercase mb-1">{k}</div>
          <div class="flex flex-wrap gap-1">
            {#each items as it}
              <button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded text-xs" on:click={() => addFilter(k, it.value)}>{it.value} ({it.count})</button>
            {/each}
          </div>
        </div>
      {/each}
      {#if Object.keys(facetSuggest).length > 0}
        <div>
          <div class="text-xs text-neutral-500 uppercase mb-1">Suggestions</div>
          {#each Object.entries(facetSuggest) as [k, items]}
            <div class="mb-1">
              <div class="text-[11px] text-neutral-500">{k}</div>
              <div class="flex flex-wrap gap-1">
                {#each (items || []).slice(0,6) as it}
                  <button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded text-xs" on:click={() => addFilter(k, it.value)}>{it.value} ({it.count})</button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
      <div>
        <div class="text-xs text-neutral-500 uppercase mb-1">Timeline (last 14d)</div>
        <div class="flex items-end gap-1 h-16">
          {#each miniBuckets as b}
            <div class="w-2 bg-neutral-700" style={`height:${Math.max(2, Math.min(60, b.count*4))}px`} title={`${b.date}: ${b.count}`} />
          {/each}
        </div>
      </div>
    </aside>
    <section class="md:col-span-3">
      <div class="mb-2 flex items-center gap-2 text-xs">
        <label class="flex items-center gap-1"><input type="checkbox" on:change={onSelectAllChange} /> Select all</label>
        <button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded" on:click={()=>runBulk('quarantine')}>Quarantine</button>
        <button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded" on:click={()=>runBulk('unquarantine')}>Unquarantine</button>
        <button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded" on:click={()=>runBulk('reembed')}>Re-embed</button>
        <button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded" on:click={()=>runBulk('promote')}>Mark Promoted</button>
      </div>
      {#if loading}
        <div class="text-neutral-400">Searching…</div>
      {:else if error}
        <div class="text-red-400">{error}</div>
      {:else}
        <div class="text-sm text-neutral-400 mb-2">{results.length} results</div>
        <div class="space-y-2">
          {#each results as r}
            <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
              <div class="flex items-start gap-3">
                <input type="checkbox" checked={!!selected[r.id]} on:change={(e)=>onRowSelectedChange(r.id, e)} />
                <div class="flex-1">
                  <ThoughtCard thought={r.thought} showActions={true} onPreview={(id)=>{ previewId=id; }} />
                </div>
              </div>
              <div class="mt-2 flex items-center justify-between text-xs">
                <div class="text-neutral-500 flex items-center gap-3">
                  <span>Score: {r.score.toFixed(3)}</span>
                  {#if r.score_components}
                    <span class="text-neutral-600">
                      base {r.score_components.base_sim.toFixed(2)} · rec {r.score_components.recency.toFixed(2)} · type {r.score_components.type.toFixed(2)} · tic {r.score_components.ticker.toFixed(2)}
                    </span>
                  {/if}
                </div>
                <div class="flex gap-2">
                  <a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700" href={`/manifold/thoughts/${r.id}`}>Open</a>
                  <a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700" href={`/manifold/relations/${r.id}`}>Relations</a>
                  <a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700" href={`/manifold/thoughts/${r.id}`}>Similar</a>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  <ThoughtPreviewModal thoughtId={previewId} onClose={() => { previewId = null; }} />
</div>



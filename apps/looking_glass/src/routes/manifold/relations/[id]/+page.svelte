<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getRelated, linkRelated, unlinkRelated, similar, relatedFacets, relatedGraph } from '$lib/api/manifold';
  import ThoughtPreviewModal from '$lib/components/manifold/ThoughtPreviewModal.svelte';
  import ThoughtCard from '$lib/components/manifold/ThoughtCard.svelte';

  let id = '';
  let data: any = null;
  let relatedId = '';
  let relationType: 'supports'|'contradicts'|'followup'|'duplicate'|'related' = 'related';
  let relationWeight: number = 1.0;
  let suggest: any[] = [];
  let previewId: string | null = null;
  let facets: Record<string, any[]> = {};
  let graph: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  let idToThought: Record<string, any> = {};
  let loading = false; let error: string | null = null;
  $: id = $page.params.id;

  async function load() {
    loading = true; error = null;
    try {
      data = await getRelated(id);
      const s = await similar(id, 10);
      suggest = s.similar || [];
      const f = await relatedFacets(id);
      facets = f.facets || {};
      graph = await relatedGraph(id, 1);
      // build id -> thought map for mini cards
      idToThought = {};
      for (const t of (data.thoughts || [])) {
        if (t && (t.id || t._id)) {
          idToThought[t.id || t._id] = t;
        }
      }
    } catch (e: any) { error = e?.message ?? 'Error'; }
    finally { loading = false; }
  }

  async function addLink() {
    await linkRelated(id, relatedId);
    relatedId = '';
    await load();
  }

  async function removeLink(rid: string) {
    await unlinkRelated(id, rid);
    await load();
  }

  onMount(load);
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Relations · {id}</h1>

  <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
    <div class="text-sm text-neutral-400">Add relation</div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
      <input class="px-3 py-2 rounded bg-neutral-800" placeholder="related_id" bind:value={relatedId} />
      <select class="px-3 py-2 rounded bg-neutral-800" bind:value={relationType}>
        <option value="related">related</option>
        <option value="supports">supports</option>
        <option value="contradicts">contradicts</option>
        <option value="followup">followup</option>
        <option value="duplicate">duplicate</option>
      </select>
      <input type="number" min="0" max="1" step="0.1" class="px-3 py-2 rounded bg-neutral-800" placeholder="weight" bind:value={relationWeight} />
      <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" on:click={addLink}>Link</button>
    </div>
    {#if suggest.length > 0}
      <div class="mt-3 text-xs text-neutral-400">Suggestions</div>
      <div class="mt-1 flex flex-wrap gap-2">
        {#each suggest as s}
          <button class="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs" on:click={() => { relatedId = s.thought_id; relationType='related'; relationWeight=1.0; }}>+ {s.title}</button>
        {/each}
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {:else if error}
    <div class="text-red-400">{error}</div>
  {:else if data}
    <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
      <div class="text-sm text-neutral-400 mb-2">Current</div>
      <div class="text-sm">
        <div class="font-semibold">{data.thought?.title}</div>
        <div class="text-neutral-400">{data.thought?.type} · {data.thought?.status}</div>
        {#if data.thought?.tickers?.length}
          <div class="mt-1 flex gap-1">{#each data.thought.tickers as t}<span class="text-xs bg-neutral-800 rounded px-2 py-0.5">{t}</span>{/each}</div>
        {/if}
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
        <div class="text-sm text-neutral-400">Outgoing</div>
        <ul class="mt-2 space-y-1">
          {#each data.outgoing as edge}
            <li class="text-sm">
              {#if idToThought[edge.to_id]}
                <div class="bg-neutral-800 rounded p-2">
                  <ThoughtCard thought={idToThought[edge.to_id]} showActions={true} onPreview={(id)=>{ previewId = id; }} />
                  <div class="mt-2 flex justify-end">
                    <button class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-xs" on:click={() => removeLink(edge.to_id)}>Unlink</button>
                  </div>
                </div>
              {:else}
                <div class="flex items-center justify-between bg-neutral-800 rounded px-2 py-1">
                  <div class="truncate flex items-center gap-2">
                    <a class="hover:underline" href={`/manifold/thoughts/${edge.to_id}`}>{edge.to_id}</a>
                    <button class="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-xs" on:click={() => { previewId = edge.to_id; }}>Preview</button>
                  </div>
                  <div class="flex gap-2">
                    <a class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800" href={`/manifold/thoughts/${edge.to_id}`}>Open</a>
                    <button class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800" on:click={() => removeLink(edge.to_id)}>Unlink</button>
                  </div>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
      <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
        <div class="text-sm text-neutral-400">Incoming</div>
        <ul class="mt-2 space-y-1">
          {#each data.incoming as edge}
            <li class="text-sm">
              {#if idToThought[edge.from_id]}
                <div class="bg-neutral-800 rounded p-2">
                  <ThoughtCard thought={idToThought[edge.from_id]} showActions={true} onPreview={(id)=>{ previewId = id; }} />
                </div>
              {:else}
                <div class="flex items-center justify-between bg-neutral-800 rounded px-2 py-1">
                  <div class="flex items-center gap-2">
                    <a class="hover:underline" href={`/manifold/thoughts/${edge.from_id}`}>{edge.from_id}</a>
                    <button class="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-xs" on:click={() => { previewId = edge.from_id; }}>Preview</button>
                  </div>
                  <a class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800" href={`/manifold/thoughts/${edge.from_id}`}>Open</a>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
      <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
        <div class="text-sm text-neutral-400">Neighbor Facets</div>
        <div class="grid grid-cols-2 gap-2 mt-2">
          {#each Object.entries(facets) as [k, items]}
            <div>
              <div class="text-xs text-neutral-500 uppercase mb-1">{k}</div>
              <div class="flex flex-wrap gap-1">
                {#each items.slice(0,6) as it}
                  <span class="px-2 py-1 bg-neutral-800 rounded text-xs">{it.value} ({it.count})</span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
    <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
      <div class="text-sm text-neutral-400 mb-2">Graph (depth 1)</div>
      <div class="text-xs text-neutral-400">Nodes: {graph.nodes.length} · Edges: {graph.edges.length}</div>
      <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <div class="text-xs text-neutral-500 mb-1">Nodes</div>
          <div class="max-h-40 overflow-auto space-y-1">
            {#each graph.nodes as n}
              <div class="flex items-center justify-between bg-neutral-800 rounded px-2 py-1">
                <div class="truncate">{n.payload?.title || n.id}</div>
                <button class="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-xs" on:click={() => { previewId = n.id; }}>Preview</button>
              </div>
            {/each}
          </div>
        </div>
        <div>
          <div class="text-xs text-neutral-500 mb-1">Edges</div>
          <div class="max-h-40 overflow-auto space-y-1">
            {#each graph.edges as e}
              <div class="text-xs bg-neutral-800 rounded px-2 py-1">{e.from} —[{e.type}]→ {e.to}</div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<ThoughtPreviewModal thoughtId={previewId} onClose={() => { previewId = null; }} />



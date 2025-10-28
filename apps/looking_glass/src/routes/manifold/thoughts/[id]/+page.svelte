<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { loadThought, saveThought, reembed, relateThoughts } from '$lib/services/manifoldService';
  import { similar, unlinkRelated } from '$lib/api/manifold';
  import TreeView from '$lib/components/manifold/TreeView.svelte';
  import VersionDiff from '$lib/components/manifold/VersionDiff.svelte';
  import NetworkCard from '$lib/components/manifold/NetworkCard.svelte';
  import TypePayloadRenderer from '$lib/components/manifold/TypePayloadRenderer.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';

  let id = '';
  let item: any = null;
  let loading = true; let error: string | null = null; let saving = false;
  let sim: any[] = [];
  let activeTab: 'details' | 'tree' | 'versions' | 'relations' = 'details';

  // Editable helpers
  let tickersStr = '';
  let tagsStr = '';
  let sectorsStr = '';
  let assumptionsStr = '';
  let evidenceStr = '';
  let newRelatedId = '';

  $: id = $page.params.id;

  async function load() {
    loading = true; error = null;
    try {
      item = await loadThought(id);
      const s = await similar(id, 10);
      sim = s.similar || [];
      // initialize helpers from item
      tickersStr = (item.tickers || []).join(', ');
      tagsStr = (item.tags || []).join(', ');
      sectorsStr = (item.sectors || []).join(', ');
      assumptionsStr = (item.epistemology?.assumptions || []).join('\n');
      evidenceStr = (item.epistemology?.evidence || []).join('\n');
      // ensure nested objects exist for binding
      item.epistemology = item.epistemology || { reasoning: '', assumptions: [], evidence: [] };
      if (item.epistemology.reasoning == null) item.epistemology.reasoning = '';
      if (!Array.isArray(item.epistemology.assumptions)) item.epistemology.assumptions = [];
      if (!Array.isArray(item.epistemology.evidence)) item.epistemology.evidence = [];
      item.flags = item.flags || {};
      if (item.flags.pinned == null) item.flags.pinned = false;
      if (item.flags.promoted_to_kg == null) item.flags.promoted_to_kg = false;
      item.type_payload = item.type_payload || {};
    } catch (e: any) { error = e?.message ?? 'Error'; }
    finally { loading = false; }
  }

  async function save() {
    saving = true;
    try {
      // normalize helpers back into arrays
      item.tickers = (tickersStr || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
      item.tags = (tagsStr || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
      item.sectors = (sectorsStr || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
      item.epistemology = item.epistemology || {};
      item.epistemology.assumptions = (assumptionsStr || '').split('\n').map((s:string)=>s.trim()).filter(Boolean);
      item.epistemology.evidence = (evidenceStr || '').split('\n').map((s:string)=>s.trim()).filter(Boolean);
      await saveThought({ ...item, id });
    } finally { saving = false; }
  }

  async function doReembed() {
    await reembed(id);
  }

  async function addRelation() {
    if (!newRelatedId) return;
    await relateThoughts(id, newRelatedId);
    newRelatedId = '';
    await load();
  }
  async function removeRelation(rid: string) {
    await unlinkRelated(id, rid);
    await load();
  }

  onMount(load);

  function onTypeChange(e: Event) {
    const target = e.currentTarget as HTMLSelectElement;
    const newType = target.value;
    item.type = newType;
    // initialize minimal payloads per type
    if (newType === 'hypothesis') {
      item.type_payload = item.type_payload || {};
      if (item.type_payload.decision_deadline === undefined) item.type_payload.decision_deadline = '';
      if (item.type_payload.validation_criteria === undefined) item.type_payload.validation_criteria = '';
      if (item.type_payload.risk_to_invalid === undefined) item.type_payload.risk_to_invalid = '';
      if (item.type_payload.expected_outcome === undefined) item.type_payload.expected_outcome = '';
    } else if (newType === 'decision') {
      item.type_payload = item.type_payload || {};
      if (item.type_payload.action === undefined) item.type_payload.action = 'buy';
      if (item.type_payload.instrument === undefined) item.type_payload.instrument = '';
      if (item.type_payload.size === undefined) item.type_payload.size = '';
      if (item.type_payload.price === undefined) item.type_payload.price = '';
      if (item.type_payload.rationale === undefined) item.type_payload.rationale = '';
      if (item.type_payload.risk === undefined) item.type_payload.risk = '';
    } else {
      item.type_payload = {};
    }
  }
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
      Thought · {id}
    </h1>
  </div>

  {#if loading}
    <div class="space-y-3">
      <div class="h-10 bg-neutral-700/50 rounded animate-pulse"></div>
      <div class="h-64 bg-neutral-700/50 rounded animate-pulse"></div>
    </div>
  {:else if error}
    <GlassPanel error={error} title="❌ Error" />
  {:else}
    <!-- Tab Navigation -->
    <div class="flex gap-2 border-b border-neutral-700 pb-4">
      <button 
        class="px-4 py-2 rounded-t-lg font-medium text-sm transition-all"
        class:bg-indigo-600={activeTab === 'details'}
        class:text-white={activeTab === 'details'}
        class:bg-neutral-800={activeTab !== 'details'}
        class:text-neutral-400={activeTab !== 'details'}
        class:hover:bg-neutral-700={activeTab !== 'details'}
        on:click={() => activeTab = 'details'}
      >
        📝 Details
      </button>
      <button 
        class="px-4 py-2 rounded-t-lg font-medium text-sm transition-all"
        class:bg-indigo-600={activeTab === 'tree'}
        class:text-white={activeTab === 'tree'}
        class:bg-neutral-800={activeTab !== 'tree'}
        class:text-neutral-400={activeTab !== 'tree'}
        class:hover:bg-neutral-700={activeTab !== 'tree'}
        on:click={() => activeTab = 'tree'}
      >
        🌳 Tree
      </button>
      <button 
        class="px-4 py-2 rounded-t-lg font-medium text-sm transition-all"
        class:bg-indigo-600={activeTab === 'versions'}
        class:text-white={activeTab === 'versions'}
        class:bg-neutral-800={activeTab !== 'versions'}
        class:text-neutral-400={activeTab !== 'versions'}
        class:hover:bg-neutral-700={activeTab !== 'versions'}
        on:click={() => activeTab = 'versions'}
      >
        📜 Versions
      </button>
      <button 
        class="px-4 py-2 rounded-t-lg font-medium text-sm transition-all"
        class:bg-indigo-600={activeTab === 'relations'}
        class:text-white={activeTab === 'relations'}
        class:bg-neutral-800={activeTab !== 'relations'}
        class:text-neutral-400={activeTab !== 'relations'}
        class:hover:bg-neutral-700={activeTab !== 'relations'}
        on:click={() => activeTab = 'relations'}
      >
        🔗 Relations
      </button>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'details'}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
        <div class="space-y-2">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div class="text-xs text-neutral-400 mb-1">Type</div>
              <select class="px-3 py-2 rounded bg-neutral-800 w-full" bind:value={item.type} on:change={onTypeChange}>
                <option value="observation">observation</option>
                <option value="hypothesis">hypothesis</option>
                <option value="analysis">analysis</option>
                <option value="decision">decision</option>
                <option value="reflection">reflection</option>
                <option value="question">question</option>
              </select>
            </div>
            <div>
              <div class="text-xs text-neutral-400 mb-1">Title</div>
              <input class="px-3 py-2 rounded bg-neutral-800 w-full" bind:value={item.title} />
            </div>
          </div>
          <textarea class="px-3 py-2 rounded bg-neutral-800 w-full" rows="8" bind:value={item.content}></textarea>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div class="text-xs text-neutral-400 mb-1">Status</div>
              <select class="px-3 py-2 rounded bg-neutral-800 w-full" bind:value={item.status}>
                <option value="active">active</option>
                <option value="validated">validated</option>
                <option value="invalidated">invalidated</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <div class="text-xs text-neutral-400 mb-1">Confidence Level</div>
              <select class="px-3 py-2 rounded bg-neutral-800 w-full" bind:value={item.confidence_level}>
                <option value="speculation">speculation</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="certain">certain</option>
              </select>
            </div>
            <div class="md:col-span-2 flex items-center gap-2">
              <div class="text-xs text-neutral-400">Confidence</div>
              <input type="range" min="0" max="1" step="0.01" bind:value={item.confidence_score} class="w-full" />
              <div class="text-xs text-neutral-300 w-10 text-right">{Math.round((item.confidence_score||0)*100)}%</div>
            </div>
            <div>
              <div class="text-xs text-neutral-400 mb-1">Timeframe</div>
              <input class="px-3 py-2 rounded bg-neutral-800 w-full" bind:value={item.timeframe} />
            </div>
            <div>
              <div class="text-xs text-neutral-400 mb-1">Tickers</div>
              <input class="px-3 py-2 rounded bg-neutral-800 w-full" bind:value={tickersStr} />
            </div>
            <div>
              <div class="text-xs text-neutral-400 mb-1">Tags</div>
              <input class="px-3 py-2 rounded bg-neutral-800 w-full" bind:value={tagsStr} />
            </div>
            <div>
              <div class="text-xs text-neutral-400 mb-1">Sectors</div>
              <input class="px-3 py-2 rounded bg-neutral-800 w-full" bind:value={sectorsStr} />
            </div>
          </div>
          <div class="bg-neutral-900 rounded p-4 border border-neutral-800 space-y-2">
            <div class="text-sm text-neutral-400">Epistemology</div>
            <div>
              <div class="text-xs text-neutral-400 mb-1">Reasoning</div>
              <textarea class="px-3 py-2 rounded bg-neutral-800 w-full" rows="3" bind:value={item.epistemology.reasoning}></textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <div class="text-xs text-neutral-400 mb-1">Assumptions (one per line)</div>
                <textarea class="px-3 py-2 rounded bg-neutral-800 w-full" rows="4" bind:value={assumptionsStr}></textarea>
              </div>
              <div>
                <div class="text-xs text-neutral-400 mb-1">Evidence (one per line)</div>
                <textarea class="px-3 py-2 rounded bg-neutral-800 w-full" rows="4" bind:value={evidenceStr}></textarea>
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" disabled={saving} on:click={save}>Save</button>
            <button class="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700" on:click={doReembed}>Re-embed</button>
            <a class="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700" href={`/manifold/relations/${id}`}>Relations</a>
            <a class="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700" href={`/manifold/promote/${id}`}>Promote</a>
          </div>
        </div>
        <div class="space-y-2">
          <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
            <div class="text-sm text-neutral-400">Flags</div>
            <label class="text-xs flex items-center gap-2"><input type="checkbox" bind:checked={item.flags.pinned} /> pinned</label>
            <label class="text-xs flex items-center gap-2"><input type="checkbox" bind:checked={item.flags.promoted_to_kg} /> promoted_to_kg</label>
          </div>
          <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
            <div class="text-sm text-neutral-400">Links</div>
            <div class="text-xs">ariadne_facts: {JSON.stringify(item.links?.ariadne_facts || [])}</div>
            <div class="text-xs">ariadne_entities: {JSON.stringify(item.links?.ariadne_entities || [])}</div>
            <div class="mt-2 text-xs">related_thoughts:</div>
            <div class="space-y-1">
              {#each (item.links?.related_thoughts || []) as rid}
                <div class="flex items-center justify-between text-xs bg-neutral-800 rounded px-2 py-1">
                  <a class="hover:underline" href={`/manifold/thoughts/${rid}`}>{rid}</a>
                  <button class="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800" on:click={() => removeRelation(rid)}>Remove</button>
                </div>
              {/each}
            </div>
            <div class="mt-2 flex gap-2">
              <input class="px-2 py-1 rounded bg-neutral-800 text-xs flex-1" placeholder="Add related_id" bind:value={newRelatedId} />
              <button class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-xs" on:click={addRelation}>Add</button>
            </div>
          </div>
          <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
            <div class="text-sm text-neutral-400 mb-2">Type Payload</div>
            <TypePayloadRenderer 
              type={item.type} 
              payload={item.type_payload || {}} 
              onChange={(p) => { item.type_payload = p; }}
            />
          </div>
          <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
            <div class="text-sm text-neutral-400 mb-1">Similar</div>
            <div class="space-y-1 max-h-[30vh] overflow-auto">
              {#each sim as s}
                <div class="text-sm flex items-center justify-between">
                  <div class="truncate">{s.title}</div>
                  <a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700" href={`/manifold/thoughts/${s.thought_id}`}>Open</a>
                </div>
              {/each}
            </div>
          </div>
          <NetworkCard thought={item} relations={item.links?.relations || []} />
        </div>
      </div>
    {/if}
    {#if activeTab === 'tree'}
      <TreeView thoughtId={id} />
    {/if}
    {#if activeTab === 'versions'}
      <VersionDiff thought={item} />
    {/if}
    {#if activeTab === 'relations'}
      <GlassPanel title="🔗 Relations">
        <div class="text-xs">ariadne_facts: {JSON.stringify(item.links?.ariadne_facts || [])}</div>
        <div class="text-xs">ariadne_entities: {JSON.stringify(item.links?.ariadne_entities || [])}</div>
        <div class="mt-2 text-xs">related_thoughts:</div>
        <div class="space-y-1">
          {#each (item.links?.related_thoughts || []) as rid}
            <div class="flex items-center justify-between text-xs bg-neutral-800 rounded px-2 py-1">
              <a class="hover:underline" href={`/manifold/thoughts/${rid}`}>{rid}</a>
              <button class="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800" on:click={() => removeRelation(rid)}>Remove</button>
            </div>
          {/each}
        </div>
        <div class="mt-2 flex gap-2">
          <input class="px-2 py-1 rounded bg-neutral-800 text-xs flex-1" placeholder="Add related_id" bind:value={newRelatedId} />
          <button class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-xs" on:click={addRelation}>Add</button>
        </div>
      </GlassPanel>
    {/if}
  {/if}
</div>

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  :global(.animate-fadeIn) {
    animation: fadeIn 0.2s ease-out;
  }
</style>



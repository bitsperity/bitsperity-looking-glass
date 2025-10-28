<script lang="ts">
  import { onMount } from 'svelte';
  import { search } from '$lib/api/manifold';
  import { saveThought, softDeleteThought } from '$lib/services/manifoldService';
  import ThoughtCard from '$lib/components/manifold/ThoughtCard.svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import CreateThoughtModal from '$lib/components/manifold/CreateThoughtModal.svelte';
  import { goto } from '$app/navigation';

  let items: any[] = [];
  let loading = false; 
  let error: string | null = null;
  let showCreateModal = false;

  let form = {
    type: 'observation',
    title: '',
    content: '',
    tickers: [] as string[],
    tags: [] as string[],
    sectors: [] as string[],
    timeframe: '',
    status: 'active',
    confidence_score: 0.5
  };
  let tickersInput: string = '';
  let tagsInput: string = '';
  let sectorsInput: string = '';

  async function load() {
    loading = true; error = null;
    try {
      const resp = await search({ query: '', limit: 100 });
      items = (resp.results || []).map((r: any) => r.thought);
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally { loading = false; }
  }

  async function create() {
    // normalize comma fields
    const payload: any = { ...form };
    payload.tickers = (tickersInput || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
    payload.tags = (tagsInput || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
    payload.sectors = (sectorsInput || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
    await saveThought(payload);
    form = { type: 'observation', title: '', content: '', tickers: [], tags: [], sectors: [], timeframe: '', status: 'active', confidence_score: 0.5 } as any;
    tickersInput = '';
    tagsInput = '';
    sectorsInput = '';
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this thought?')) return;
    await softDeleteThought(id);
    await load();
  }

  function openThought(id: string) {
    goto(`/manifold/thoughts/${id}`);
  }

  onMount(load);
  let previewId: string | null = null;
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
      Manifold · Thoughts
    </h1>
    <button 
      on:click={() => showCreateModal = true}
      class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all duration-150 shadow-lg hover:shadow-indigo-500/50 active:scale-95"
    >
      ✨ Create Thought
    </button>
  </div>
  <ManifoldNav />

  <CreateThoughtModal 
    open={showCreateModal} 
    onSuccess={() => { showCreateModal = false; load(); }} 
  />

  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {:else if error}
    <div class="text-red-400">{error}</div>
  {:else}
    <div class="text-sm text-neutral-400 mb-2">{items.length} thoughts</div>
    <div class="space-y-2">
      {#each items as it}
        <ThoughtCard thought={it} onOpen={openThought} onDelete={remove} onPreview={(id)=>{ previewId=id; }} />
      {/each}
    </div>
  {/if}
</div>

<ThoughtPreviewModal thoughtId={previewId} onClose={() => { previewId = null; }} />



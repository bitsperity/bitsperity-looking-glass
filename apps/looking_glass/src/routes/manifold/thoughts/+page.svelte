<script lang="ts">
  import { onMount } from 'svelte';
  import { search, getThought } from '$lib/api/manifold';
  import { saveThought, softDeleteThought } from '$lib/services/manifoldService';
  import ThoughtCard from '$lib/components/manifold/ThoughtCard.svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import CreateThoughtModal from '$lib/components/manifold/CreateThoughtModal.svelte';
  import ThoughtPreviewModal from '$lib/components/manifold/ThoughtPreviewModal.svelte';
  import { goto } from '$app/navigation';

  let items: any[] = [];
  let loading = false; 
  let error: string | null = null;
  let showCreateModal = false;
  let previewId: string | null = null;
  let previewThought: any | null = null;
  let searchQuery = '';
  let filterType = '';
  let filterStatus = '';

  async function load() {
    loading = true; error = null;
    try {
      const filters: any = {};
      if (filterType) filters.must = [...(filters.must || []), { field: 'type', op: 'match', value: filterType }];
      if (filterStatus) filters.must = [...(filters.must || []), { field: 'status', op: 'match', value: filterStatus }];
      
      const resp = await search({ 
        query: searchQuery, 
        limit: 100,
        filters: Object.keys(filters).length > 0 ? filters : undefined
      });
      items = (resp.results || []).map((r: any) => r.thought);
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally { loading = false; }
  }

  async function remove(id: string) {
    if (!confirm('Delete this thought?')) return;
    await softDeleteThought(id);
    await load();
  }

  function openThought(id: string) {
    goto(`/manifold/thoughts/${id}`);
  }

  async function showPreview(id: string) {
    try {
      previewThought = await getThought(id);
      previewId = id;
    } catch (e: any) {
      console.error('Error loading preview:', e);
    }
  }

  function closePreview() {
    previewId = null;
    previewThought = null;
  }

  $: if (searchQuery || filterType || filterStatus) {
    load();
  }

  onMount(load);

  function colorForType(type?: string): string {
    const colors: Record<string, string> = {
      observation: '#10b981',
      hypothesis: '#3b82f6',
      analysis: '#8b5cf6',
      decision: '#f59e0b',
      reflection: '#ec4899',
      question: '#06b6d4',
    };
    return colors[type || 'observation'] || '#6b7280';
  }

  // Stats
  $: typeStats = items.reduce((acc, t) => {
    acc[t.type || 'unknown'] = (acc[t.type || 'unknown'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
</script>

<div class="h-full overflow-y-auto bg-neutral-950">
  <div class="max-w-7xl mx-auto px-6 py-8">
    <!-- Header Section -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-4xl font-bold text-neutral-100 mb-2">Thoughts</h1>
          <p class="text-neutral-400">Explore and manage your knowledge graph</p>
        </div>
        <button 
          on:click={() => showCreateModal = true}
          class="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-95 flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Thought
        </button>
      </div>
      <ManifoldNav />
    </div>

    <!-- Stats Cards -->
    {#if !loading && items.length > 0}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-4">
          <div class="text-sm text-neutral-400 mb-1">Total Thoughts</div>
          <div class="text-2xl font-bold text-neutral-100">{items.length}</div>
        </div>
        {#each Object.entries(typeStats).slice(0, 3) as [type, count]}
          <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-4">
            <div class="flex items-center gap-2 mb-1">
              <div 
                class="w-2 h-2 rounded-full"
                style="background-color: {colorForType(type)}"
              ></div>
              <div class="text-sm text-neutral-400 capitalize">{type}</div>
            </div>
            <div class="text-2xl font-bold text-neutral-100">{count}</div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Filters & Search -->
    <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-medium text-neutral-400 mb-2">Search</label>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search thoughts..."
            class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-neutral-400 mb-2">Type</label>
          <select
            bind:value={filterType}
            class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="">All Types</option>
            <option value="observation">Observation</option>
            <option value="hypothesis">Hypothesis</option>
            <option value="analysis">Analysis</option>
            <option value="decision">Decision</option>
            <option value="reflection">Reflection</option>
            <option value="question">Question</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-neutral-400 mb-2">Status</label>
          <select
            bind:value={filterStatus}
            class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="validated">Validated</option>
            <option value="invalidated">Invalidated</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
    </div>

    <CreateThoughtModal 
      open={showCreateModal} 
      onSuccess={() => { showCreateModal = false; load(); }} 
    />

    <ThoughtPreviewModal
      open={!!previewId}
      thought={previewThought}
      onClose={closePreview}
      onOpen={openThought}
    />

    <!-- Content -->
    {#if loading}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each Array(6) as _}
          <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-6 animate-pulse">
            <div class="h-4 bg-neutral-800 rounded w-3/4 mb-3"></div>
            <div class="h-3 bg-neutral-800 rounded w-full mb-2"></div>
            <div class="h-3 bg-neutral-800 rounded w-5/6"></div>
          </div>
        {/each}
      </div>
    {:else if error}
      <div class="bg-red-900/20 border border-red-800 rounded-xl p-6 text-red-400">
        {error}
      </div>
    {:else if items.length === 0}
      <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-12 text-center">
        <svg class="w-16 h-16 mx-auto text-neutral-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="text-lg font-semibold text-neutral-300 mb-2">No thoughts found</h3>
        <p class="text-neutral-500 mb-6">Get started by creating your first thought</p>
        <button 
          on:click={() => showCreateModal = true}
          class="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm transition-all duration-200"
        >
          Create Thought
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each items as it}
          <ThoughtCard thought={it} onOpen={openThought} onDelete={remove} onPreview={showPreview} />
        {/each}
      </div>
    {/if}
  </div>
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import { getWorkspaces } from '$lib/api/manifold';
  import WorkspaceCard from '$lib/components/manifold/WorkspaceCard.svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  import { goto } from '$app/navigation';

  let loading = true;
  let workspaces: any[] = [];
  let error: string | null = null;
  let searchQuery = '';

  async function load() {
    loading = true;
    error = null;
    try {
      const resp = await getWorkspaces(1000);
      workspaces = resp.workspaces || [];
    } catch (e: any) {
      error = e?.message ?? 'Error loading workspaces';
    } finally {
      loading = false;
    }
  }

  function openSearch(workspaceId: string) {
    goto(`/manifold/search?workspace_id=${encodeURIComponent(workspaceId)}`);
  }

  function openGraph(workspaceId: string) {
    goto(`/manifold/graph?workspace_id=${encodeURIComponent(workspaceId)}`);
  }

  function openDetail(workspaceId: string) {
    goto(`/manifold/workspaces/${encodeURIComponent(workspaceId)}`);
  }

  $: filteredWorkspaces = workspaces.filter(w => 
    !searchQuery || 
    w.workspace_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  onMount(load);
</script>

<div class="p-6 space-y-6 h-full overflow-auto">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
      Workspaces
    </h1>
  </div>
  
  <ManifoldNav />

  {#if loading}
    <GlassPanel title="Loading workspaces..." loading={true} />
  {:else if error}
    <GlassPanel error={error} title="❌ Error" />
  {:else}
    <!-- Search -->
    <GlassPanel>
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-neutral-300 mb-2 block">Search Workspaces</label>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Filter by workspace ID..."
            class="w-full px-4 py-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div class="text-sm text-neutral-400">
          Showing {filteredWorkspaces.length} of {workspaces.length} workspaces
        </div>
      </div>
    </GlassPanel>

    <!-- Workspaces Grid -->
    {#if filteredWorkspaces.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each filteredWorkspaces as workspace (workspace.workspace_id)}
          <div 
            class="cursor-pointer"
            on:click={() => openDetail(workspace.workspace_id)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && openDetail(workspace.workspace_id)}
          >
            <WorkspaceCard 
              {workspace}
              onOpenSearch={openSearch}
              onOpenGraph={openGraph}
            />
          </div>
        {/each}
      </div>
    {:else}
      <GlassPanel emptyMessage="No workspaces found" />
    {/if}
  {/if}
</div>

<style>
  :global(body) {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.4) 100%);
  }
</style>


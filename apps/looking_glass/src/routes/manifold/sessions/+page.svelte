<script lang="ts">
  import { onMount } from 'svelte';
  import { getSessions } from '$lib/api/manifold';
  import SessionCard from '$lib/components/manifold/SessionCard.svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  import { goto } from '$app/navigation';

  let loading = true;
  let sessions: any[] = [];
  let error: string | null = null;
  let searchQuery = '';

  async function load() {
    loading = true;
    error = null;
    try {
      const resp = await getSessions(1000);
      sessions = resp.sessions || [];
    } catch (e: any) {
      error = e?.message ?? 'Error loading sessions';
    } finally {
      loading = false;
    }
  }

  function openSearch(sessionId: string) {
    goto(`/manifold/search?session_id=${encodeURIComponent(sessionId)}`);
  }

  function openGraph(sessionId: string) {
    goto(`/manifold/graph?session_id=${encodeURIComponent(sessionId)}`);
  }

  function openDetail(sessionId: string) {
    goto(`/manifold/sessions/${encodeURIComponent(sessionId)}`);
  }

  $: filteredSessions = sessions.filter(s => 
    !searchQuery || 
    s.session_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  onMount(load);
</script>

<div class="p-6 space-y-6 h-full overflow-auto">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
      Sessions
    </h1>
  </div>
  
  <ManifoldNav />

  {#if loading}
    <GlassPanel title="Loading sessions..." loading={true} />
  {:else if error}
    <GlassPanel error={error} title="❌ Error" />
  {:else}
    <!-- Search -->
    <GlassPanel>
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-neutral-300 mb-2 block">Search Sessions</label>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Filter by session ID..."
            class="w-full px-4 py-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div class="text-sm text-neutral-400">
          Showing {filteredSessions.length} of {sessions.length} sessions
        </div>
      </div>
    </GlassPanel>

    <!-- Sessions Grid -->
    {#if filteredSessions.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each filteredSessions as session (session.session_id)}
          <div 
            class="cursor-pointer"
            on:click={() => openDetail(session.session_id)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && openDetail(session.session_id)}
          >
            <SessionCard 
              {session}
              onOpenSearch={openSearch}
              onOpenGraph={openGraph}
            />
          </div>
        {/each}
      </div>
    {:else}
      <GlassPanel emptyMessage="No sessions found" />
    {/if}
  {/if}
</div>

<style>
  :global(body) {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.4) 100%);
  }
</style>


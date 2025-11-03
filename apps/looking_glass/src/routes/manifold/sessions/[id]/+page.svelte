<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getSessionThoughts, getSessionGraph, getSessionSummary, upsertSessionSummary } from '$lib/api/manifold';
  import { timeline } from '$lib/api/manifold';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  import ThoughtCard from '$lib/components/manifold/ThoughtCard.svelte';
  import { goto } from '$app/navigation';

  let sessionId = '';
  let loading = true;
  let error: string | null = null;
  let activeTab: 'thoughts' | 'graph' | 'timeline' | 'summary' = 'thoughts';
  
  let thoughts: any[] = [];
  let graphData: any = null;
  let timelineData: any = null;
  let summary: any = null;
  
  let summaryTitle = '';
  let summaryText = '';
  let summaryContent = '';
  let editingSummary = false;
  let savingSummary = false;

  $: sessionId = $page.params.id || '';

  async function loadThoughts() {
    try {
      const resp = await getSessionThoughts(sessionId, false);
      thoughts = resp.thoughts || [];
    } catch (e: any) {
      console.error('Error loading thoughts:', e);
    }
  }

  async function loadGraph() {
    try {
      graphData = await getSessionGraph(sessionId);
    } catch (e: any) {
      console.error('Error loading graph:', e);
    }
  }

  async function loadTimeline() {
    try {
      timelineData = await timeline({ session_id: sessionId });
    } catch (e: any) {
      console.error('Error loading timeline:', e);
    }
  }

  async function loadSummary() {
    try {
      const resp = await getSessionSummary(sessionId);
      summary = resp.summary;
      if (summary) {
        summaryTitle = summary.title || '';
        summaryText = summary.summary || '';
        summaryContent = summary.content || '';
      }
    } catch (e: any) {
      console.error('Error loading summary:', e);
    }
  }

  async function saveSummary() {
    savingSummary = true;
    try {
      await upsertSessionSummary(sessionId, {
        title: summaryTitle || `Session Summary: ${sessionId}`,
        summary: summaryText,
        content: summaryContent || summaryText,
      });
      editingSummary = false;
      await loadSummary();
    } catch (e: any) {
      console.error('Error saving summary:', e);
    } finally {
      savingSummary = false;
    }
  }

  async function load() {
    loading = true;
    error = null;
    try {
      await Promise.all([
        loadThoughts(),
        loadGraph(),
        loadTimeline(),
        loadSummary(),
      ]);
    } catch (e: any) {
      error = e?.message ?? 'Error loading session';
    } finally {
      loading = false;
    }
  }

  function openThought(id: string) {
    goto(`/manifold/thoughts/${id}`);
  }

  function openGraph() {
    goto(`/manifold/graph?session_id=${encodeURIComponent(sessionId)}`);
  }

  function openSearch() {
    goto(`/manifold/search?session_id=${encodeURIComponent(sessionId)}`);
  }

  onMount(() => {
    if (sessionId) {
      load();
    }
  });
</script>

<div class="p-6 space-y-6 h-full overflow-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
        Session: {sessionId}
      </h1>
      <div class="text-sm text-neutral-400 mt-1">
        {thoughts.length} thoughts
      </div>
    </div>
    <div class="flex gap-2">
      <button
        class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-sm font-medium text-neutral-200 transition-colors"
        on:click={openSearch}
      >
        🔍 Search
      </button>
      <button
        class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
        on:click={openGraph}
      >
        📊 Graph
      </button>
    </div>
  </div>
  
  <ManifoldNav />

  {#if loading}
    <GlassPanel title="Loading session..." loading={true} />
  {:else if error}
    <GlassPanel error={error} title="❌ Error" />
  {:else}
    <!-- Tabs -->
    <div class="flex gap-2 border-b border-neutral-800 pb-3">
      <button
        class="px-4 py-2 rounded text-sm font-medium transition-colors {activeTab === 'thoughts' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
        on:click={() => activeTab = 'thoughts'}
      >
        Thoughts ({thoughts.length})
      </button>
      <button
        class="px-4 py-2 rounded text-sm font-medium transition-colors {activeTab === 'graph' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
        on:click={() => activeTab = 'graph'}
      >
        Graph ({graphData?.nodes?.length || 0} nodes)
      </button>
      <button
        class="px-4 py-2 rounded text-sm font-medium transition-colors {activeTab === 'timeline' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
        on:click={() => activeTab = 'timeline'}
      >
        Timeline
      </button>
      <button
        class="px-4 py-2 rounded text-sm font-medium transition-colors {activeTab === 'summary' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
        on:click={() => activeTab = 'summary'}
      >
        Summary
      </button>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'thoughts'}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each thoughts as thought (thought.id)}
          <div on:click={() => openThought(thought.id)} class="cursor-pointer">
            <ThoughtCard thought={thought} />
          </div>
        {/each}
      </div>
      {#if thoughts.length === 0}
        <GlassPanel emptyMessage="No thoughts in this session" />
      {/if}
    {:else if activeTab === 'graph'}
      <GlassPanel>
        <div class="space-y-4">
          <div class="text-sm text-neutral-400">
            Graph: {graphData?.nodes?.length || 0} nodes, {graphData?.edges?.length || 0} edges
          </div>
          <button
            class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
            on:click={openGraph}
          >
            Open in Graph View →
          </button>
        </div>
      </GlassPanel>
    {:else if activeTab === 'timeline'}
      <GlassPanel>
        <div class="space-y-4">
          {#if timelineData?.bucketed}
            {#each Object.entries(timelineData.bucketed) as [date, items] (date)}
              <div class="border-b border-neutral-800 pb-4 last:border-0">
                <div class="text-sm font-semibold text-neutral-300 mb-2">{date}</div>
                <div class="text-xs text-neutral-500">{Array.isArray(items) ? items.length : 0} thoughts</div>
              </div>
            {/each}
          {:else}
            <div class="text-sm text-neutral-400">No timeline data available</div>
          {/if}
        </div>
      </GlassPanel>
    {:else if activeTab === 'summary'}
      <GlassPanel>
        <div class="space-y-4">
          {#if editingSummary}
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-neutral-300 mb-2 block">Title</label>
                <input
                  type="text"
                  bind:value={summaryTitle}
                  class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200"
                  placeholder="Session Summary Title"
                />
              </div>
              <div>
                <label class="text-sm font-medium text-neutral-300 mb-2 block">Summary (1-2 sentences)</label>
                <textarea
                  bind:value={summaryText}
                  rows="2"
                  class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200"
                  placeholder="Brief summary..."
                />
              </div>
              <div>
                <label class="text-sm font-medium text-neutral-300 mb-2 block">Content (detailed)</label>
                <textarea
                  bind:value={summaryContent}
                  rows="8"
                  class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200"
                  placeholder="Detailed summary content..."
                />
              </div>
              <div class="flex gap-2">
                <button
                  class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
                  on:click={saveSummary}
                  disabled={savingSummary}
                >
                  {savingSummary ? 'Saving...' : 'Save Summary'}
                </button>
                <button
                  class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-sm font-medium text-neutral-200 transition-colors"
                  on:click={() => {
                    editingSummary = false;
                    if (summary) {
                      summaryTitle = summary.title || '';
                      summaryText = summary.summary || '';
                      summaryContent = summary.content || '';
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            {#if summary}
              <div class="space-y-4">
                <div>
                  <h3 class="text-lg font-semibold text-neutral-100 mb-2">{summary.title}</h3>
                  <p class="text-sm text-neutral-300 whitespace-pre-wrap">{summary.summary || summary.content}</p>
                </div>
                <button
                  class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
                  on:click={() => editingSummary = true}
                >
                  Edit Summary
                </button>
              </div>
            {:else}
              <div class="space-y-4">
                <p class="text-sm text-neutral-400">No summary yet. Create one to document this session.</p>
                <button
                  class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
                  on:click={() => {
                    editingSummary = true;
                    summaryTitle = `Session Summary: ${sessionId}`;
                  }}
                >
                  Create Summary
                </button>
              </div>
            {/if}
          {/if}
        </div>
      </GlassPanel>
    {/if}
  {/if}
</div>

<style>
  :global(body) {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.4) 100%);
  }
</style>


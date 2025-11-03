<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getWorkspaceThoughts, getWorkspaceGraph, getWorkspaceSummary, upsertWorkspaceSummary, getWorkspaceSessions } from '$lib/api/manifold';
  import { timeline } from '$lib/api/manifold';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  import ThoughtCard from '$lib/components/manifold/ThoughtCard.svelte';
  import MiniGraph from '$lib/components/manifold/MiniGraph.svelte';
  import SessionCard from '$lib/components/manifold/SessionCard.svelte';
  import { goto } from '$app/navigation';

  let workspaceId = '';
  let loading = true;
  let error: string | null = null;
  let activeTab: 'thoughts' | 'sessions' | 'graph' | 'timeline' | 'summary' = 'thoughts';
  
  let thoughts: any[] = [];
  let sessions: any[] = [];
  let graphData: any = null;
  let timelineData: any = null;
  let summary: any = null;
  
  let summaryTitle = '';
  let summaryText = '';
  let summaryContent = '';
  let editingSummary = false;
  let savingSummary = false;
  
  let currentLimit = 20;
  let isLoadingMore = false;
  let hasMore = true;

  $: workspaceId = $page.params.id || '';

  async function loadThoughts(reset = false) {
    try {
      if (reset) {
        currentLimit = 20;
        thoughts = [];
        hasMore = true;
      }
      const resp = await getWorkspaceThoughts(workspaceId, false, currentLimit);
      const newThoughts = resp.thoughts || [];
      if (reset) {
        thoughts = newThoughts;
      } else {
        // Append new thoughts, avoiding duplicates
        const existingIds = new Set(thoughts.map(t => t.id));
        thoughts = [...thoughts, ...newThoughts.filter(t => !existingIds.has(t.id))];
      }
      hasMore = newThoughts.length === currentLimit && currentLimit < 100;
    } catch (e: any) {
      console.error('Error loading thoughts:', e);
    }
  }
  
  async function loadMoreThoughts() {
    if (isLoadingMore || !hasMore) return;
    isLoadingMore = true;
    try {
      currentLimit = Math.min(currentLimit + 20, 100);
      await loadThoughts(false);
    } finally {
      isLoadingMore = false;
    }
  }

  async function loadGraph() {
    try {
      graphData = await getWorkspaceGraph(workspaceId);
    } catch (e: any) {
      console.error('Error loading graph:', e);
    }
  }

  async function loadTimeline() {
    try {
      timelineData = await timeline({ workspace_id: workspaceId });
    } catch (e: any) {
      console.error('Error loading timeline:', e);
    }
  }

  async function loadSessions() {
    try {
      const resp = await getWorkspaceSessions(workspaceId, 100);
      sessions = resp.sessions || [];
    } catch (e: any) {
      console.error('Error loading sessions:', e);
    }
  }

  async function loadSummary() {
    try {
      const resp = await getWorkspaceSummary(workspaceId);
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
      await upsertWorkspaceSummary(workspaceId, {
        title: summaryTitle || `Workspace Summary: ${workspaceId}`,
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
        loadThoughts(true),
        loadSessions(),
        loadGraph(),
        loadTimeline(),
        loadSummary(),
      ]);
    } catch (e: any) {
      error = e?.message ?? 'Error loading workspace';
    } finally {
      loading = false;
    }
  }

  function openSession(sessionId: string) {
    goto(`/manifold/sessions/${sessionId}?workspace_id=${encodeURIComponent(workspaceId)}`);
  }

  function openSessionSearch(sessionId: string) {
    goto(`/manifold/search?session_id=${encodeURIComponent(sessionId)}&workspace_id=${encodeURIComponent(workspaceId)}`);
  }

  function openSessionGraph(sessionId: string) {
    goto(`/manifold/graph?session_id=${encodeURIComponent(sessionId)}&workspace_id=${encodeURIComponent(workspaceId)}`);
  }

  function openThought(id: string) {
    goto(`/manifold/thoughts/${id}`);
  }

  function openGraph() {
    goto(`/manifold/graph?workspace_id=${encodeURIComponent(workspaceId)}`);
  }

  function openSearch() {
    goto(`/manifold/search?workspace_id=${encodeURIComponent(workspaceId)}`);
  }

  onMount(() => {
    if (workspaceId) {
      load();
    }
  });
</script>

<div class="p-6 space-y-6 h-full overflow-auto">
  <div class="flex items-start justify-between gap-4">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-3 mb-2 flex-wrap">
        <h1 class="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent break-words">
          {workspaceId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h1>
        <span class="text-xs bg-indigo-950/50 text-indigo-300 px-2 py-1 rounded font-medium flex-shrink-0">
          Workspace
        </span>
      </div>
      <div class="flex items-center gap-4 text-sm text-neutral-400">
        <span class="flex items-center gap-1">
          <span class="text-neutral-500">💭</span>
          <span class="font-medium text-neutral-300">{thoughts.length}</span>
          <span>thoughts</span>
        </span>
        <span class="flex items-center gap-1">
          <span class="text-neutral-500">📊</span>
          <span class="font-medium text-neutral-300">{sessions.length}</span>
          <span>sessions</span>
        </span>
        {#if graphData?.nodes}
          <span class="flex items-center gap-1">
            <span class="text-neutral-500">🔗</span>
            <span class="font-medium text-neutral-300">{graphData.nodes.length}</span>
            <span>nodes</span>
          </span>
        {/if}
      </div>
    </div>
    <div class="flex gap-2 flex-shrink-0">
      <button
        class="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm font-medium text-neutral-200 transition-all hover:shadow-lg active:scale-95"
        on:click={openSearch}
      >
        🔍 Search
      </button>
      <button
        class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-indigo-500/50 active:scale-95"
        on:click={openGraph}
      >
        📊 Graph
      </button>
    </div>
  </div>
  
  <ManifoldNav />

  {#if loading}
    <GlassPanel title="Loading workspace..." loading={true} />
  {:else if error}
    <GlassPanel error={error} title="❌ Error" />
  {:else}
    <!-- Tabs -->
    <div class="flex gap-1 border-b border-neutral-800 pb-0 overflow-x-auto">
      <button
        class="px-4 py-3 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap relative {activeTab === 'thoughts' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
        on:click={() => activeTab = 'thoughts'}
      >
        💭 Thoughts
        <span class="ml-2 text-xs opacity-75">({thoughts.length})</span>
        {#if activeTab === 'thoughts'}
          <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400"></div>
        {/if}
      </button>
      <button
        class="px-4 py-3 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap relative {activeTab === 'sessions' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
        on:click={() => activeTab = 'sessions'}
      >
        📊 Sessions
        <span class="ml-2 text-xs opacity-75">({sessions.length})</span>
        {#if activeTab === 'sessions'}
          <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400"></div>
        {/if}
      </button>
      <button
        class="px-4 py-3 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap relative {activeTab === 'graph' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
        on:click={() => activeTab = 'graph'}
      >
        🔗 Graph
        <span class="ml-2 text-xs opacity-75">({graphData?.nodes?.length || 0})</span>
        {#if activeTab === 'graph'}
          <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400"></div>
        {/if}
      </button>
      <button
        class="px-4 py-3 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap relative {activeTab === 'timeline' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
        on:click={() => activeTab = 'timeline'}
      >
        📅 Timeline
        {#if activeTab === 'timeline'}
          <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400"></div>
        {/if}
      </button>
      <button
        class="px-4 py-3 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap relative {activeTab === 'summary' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
        on:click={() => activeTab = 'summary'}
      >
        📝 Summary
        {#if activeTab === 'summary'}
          <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400"></div>
        {/if}
      </button>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'thoughts'}
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each thoughts as thought (thought.id)}
            <div on:click={() => openThought(thought.id)} class="cursor-pointer">
              <ThoughtCard thought={thought} />
            </div>
          {/each}
        </div>
        {#if thoughts.length === 0}
          <GlassPanel>
            <div class="text-center py-12 space-y-4">
              <div class="text-4xl mb-2">💭</div>
              <div class="text-lg font-semibold text-neutral-300">No thoughts yet</div>
              <div class="text-sm text-neutral-400 max-w-md mx-auto">
                This workspace is empty. Create thoughts and assign them to this workspace to get started.
              </div>
            </div>
          </GlassPanel>
        {:else if hasMore}
          <div class="flex justify-center pt-4">
            <button
              class="px-6 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              on:click={loadMoreThoughts}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading...' : `Load More (${thoughts.length} / ${currentLimit})`}
            </button>
          </div>
        {/if}
      </div>
    {:else if activeTab === 'sessions'}
      <div class="space-y-4">
        {#if sessions.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each sessions as session (session.session_id)}
              <div 
                class="cursor-pointer"
                on:click={() => openSession(session.session_id)}
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === 'Enter' && openSession(session.session_id)}
              >
                <SessionCard 
                  {session}
                  onOpenSearch={openSessionSearch}
                  onOpenGraph={openSessionGraph}
                />
              </div>
            {/each}
          </div>
        {:else}
          <GlassPanel>
            <div class="text-center py-12 space-y-4">
              <div class="text-4xl mb-2">📊</div>
              <div class="text-lg font-semibold text-neutral-300">No sessions yet</div>
              <div class="text-sm text-neutral-400 max-w-md mx-auto">
                Sessions are created automatically when thoughts are assigned to them. Create thoughts with a session_id to organize them into sessions.
              </div>
            </div>
          </GlassPanel>
        {/if}
      </div>
    {:else if activeTab === 'graph'}
      <GlassPanel>
        <div class="space-y-4">
          {#if !graphData}
            <div class="text-sm text-neutral-400 text-center py-12">
              <div class="text-lg mb-2">📊</div>
              <div>Loading graph data...</div>
            </div>
          {:else if graphData?.nodes && graphData.nodes.length > 0}
            <div class="relative">
              <MiniGraph nodes={graphData.nodes} edges={graphData.edges || []} height={500} />
            </div>
            <div class="flex justify-center pt-4">
              <button
                class="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-indigo-500/50 active:scale-95"
                on:click={openGraph}
              >
                Open in Full Graph View →
              </button>
            </div>
          {:else}
            <div class="text-center py-12 space-y-4">
              <div class="text-4xl mb-2">🔗</div>
              <div class="text-lg font-semibold text-neutral-300">No graph data available</div>
              <div class="text-sm text-neutral-400 max-w-md mx-auto">
                This workspace doesn't have any relationships between thoughts yet. Create relationships or open the full graph view to explore.
              </div>
              <div class="flex justify-center pt-4">
                <button
                  class="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-indigo-500/50 active:scale-95"
                  on:click={openGraph}
                >
                  Open in Graph View →
                </button>
              </div>
            </div>
          {/if}
        </div>
      </GlassPanel>
    {:else if activeTab === 'timeline'}
      <GlassPanel>
        <div class="space-y-4">
          {#if !timelineData}
            <div class="text-sm text-neutral-400 text-center py-12">
              <div class="text-lg mb-2">📅</div>
              <div>Loading timeline data...</div>
            </div>
          {:else if timelineData?.bucketed && Object.keys(timelineData.bucketed).length > 0}
            <div class="space-y-3">
              {#each Object.entries(timelineData.bucketed).sort(([a], [b]) => b.localeCompare(a)) as [date, items] (date)}
                <div class="border-b border-neutral-800 pb-3 last:border-0 hover:bg-neutral-800/30 rounded px-3 py-2 transition-colors">
                  <div class="flex items-center justify-between mb-1">
                    <div class="text-sm font-semibold text-neutral-200">{date}</div>
                    <div class="text-xs bg-indigo-950/50 text-indigo-300 px-2 py-0.5 rounded font-medium">
                      {Array.isArray(items) ? items.length : 0} {Array.isArray(items) && items.length === 1 ? 'thought' : 'thoughts'}
                    </div>
                  </div>
                  {#if Array.isArray(items) && items.length > 0 && items[0]?.title}
                    <div class="text-xs text-neutral-400 truncate">
                      {items[0].title}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-center py-12 space-y-4">
              <div class="text-4xl mb-2">📅</div>
              <div class="text-lg font-semibold text-neutral-300">No timeline data available</div>
              <div class="text-sm text-neutral-400 max-w-md mx-auto">
                This workspace doesn't have any thoughts with timestamps yet.
              </div>
            </div>
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
                  placeholder="Workspace Summary Title"
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
                  <h3 class="text-lg font-semibold text-neutral-100 mb-2">{summary.title || 'Untitled Summary'}</h3>
                  <p class="text-sm text-neutral-300 whitespace-pre-wrap">{summary.summary || summary.content || 'No summary content available.'}</p>
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
                <p class="text-sm text-neutral-400">No summary yet. Create one to document this workspace.</p>
                <button
                  class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
                  on:click={() => {
                    editingSummary = true;
                    summaryTitle = `Workspace Summary: ${workspaceId}`;
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


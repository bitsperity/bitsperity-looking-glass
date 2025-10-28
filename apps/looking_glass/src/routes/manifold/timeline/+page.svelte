<script lang="ts">
  import { onMount } from 'svelte';
  import { timeline, getSessions } from '$lib/api/manifold';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  import InteractiveTimeline from '$lib/components/manifold/InteractiveTimeline.svelte';
  import { goto } from '$app/navigation';

  let type = '';
  let tickers = '';
  let sessionId = '';
  let from_dt = '';
  let to_dt = '';
  let data: any = null;
  let sessions: any[] = [];
  let loading = false;
  let error: string | null = null;

  async function load() {
    loading = true;
    error = null;
    data = null;
    
    try {
      const params: any = {
        type: type || undefined,
        tickers: tickers || undefined,
        from_dt: from_dt || undefined,
        to_dt: to_dt || undefined,
      };
      if (sessionId) params.session_id = sessionId;
      
      data = await timeline(params);
    } catch (e: any) {
      error = e?.message ?? 'Error loading timeline';
    } finally {
      loading = false;
    }
  }

  async function loadSessions() {
    try {
      const resp = await getSessions(100);
      sessions = resp.sessions || [];
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  }

  function typeIcon(t?: string): string {
    const icons: Record<string, string> = {
      observation: '●',
      hypothesis: '⬡',
      analysis: '■',
      decision: '◆',
      reflection: '✦',
      question: '△',
      summary: '⚡',
    };
    return icons[t || ''] || '•';
  }

  function groupBySession(items: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      const sid = item.session_id || 'no-session';
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(item);
    }
    return grouped;
  }

  onMount(async () => {
    await loadSessions();
    await load();
  });

  $: dayCount = Object.keys(data?.bucketed || {}).length;
  $: totalThoughts = Object.values(data?.bucketed || {}).reduce((sum: number, items: any) => sum + (items?.length || 0), 0);
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
      Manifold · Timeline
    </h1>
  </div>
  
  <ManifoldNav />

  <!-- Filters -->
  <GlassPanel title="🔍 Filters">
    <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
      <div>
        <label class="text-xs text-neutral-400 mb-1 block font-medium">Type</label>
        <input 
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          placeholder="observation, analysis, …" 
          bind:value={type}
        />
      </div>
      <div>
        <label class="text-xs text-neutral-400 mb-1 block font-medium">Tickers</label>
        <input 
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          placeholder="NVDA,TSLA,…" 
          bind:value={tickers}
        />
      </div>
      <div>
        <label class="text-xs text-neutral-400 mb-1 block font-medium">Session</label>
        <select 
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
          bind:value={sessionId}
        >
          <option value="">All Sessions</option>
          {#each sessions as session (session.session_id)}
            <option value={session.session_id}>
              {session.session_id} ({session.count})
            </option>
          {/each}
        </select>
      </div>
      <div>
        <label class="text-xs text-neutral-400 mb-1 block font-medium">From</label>
        <input 
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          type="date"
          bind:value={from_dt}
        />
      </div>
      <div>
        <label class="text-xs text-neutral-400 mb-1 block font-medium">To</label>
        <input 
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          type="date"
          bind:value={to_dt}
        />
      </div>
    </div>
    <button 
      class="mt-3 w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors shadow-lg hover:shadow-indigo-500/50 active:scale-95"
      on:click={load}
      disabled={loading}
    >
      {loading ? 'Loading…' : 'Apply Filters'}
    </button>
  </GlassPanel>

  <!-- Interactive Timeline -->
  {#if data && Object.keys(data.bucketed || {}).length > 0}
    <GlassPanel title="📈 Interactive Timeline">
      <InteractiveTimeline 
        data={Object.entries(data.bucketed || {})
          .map(([date, items]: any) => ({
            date,
            count: (items || []).length,
            sessions: groupBySession(items || [])
          }))
          .sort((a, b) => a.date.localeCompare(b.date))}
        onSelectRange={(start, end) => {
          from_dt = start;
          to_dt = end;
          load();
        }}
      />
    </GlassPanel>
  {/if}

  <!-- Results -->
  {#if loading}
    <GlassPanel title="📅 Results" loading={true} />
  {:else if error}
    <GlassPanel title="📅 Results" error={error} />
  {:else if data && dayCount > 0}
    <GlassPanel title="📅 Results">
      <div class="space-y-1 mb-3 text-sm">
        <div class="text-neutral-300">
          <span class="font-semibold">{dayCount}</span> days · 
          <span class="font-semibold">{totalThoughts}</span> thoughts
        </div>
      </div>

      <div class="space-y-3 max-h-[65vh] overflow-y-auto">
        {#each Object.entries(data.bucketed || {}).sort(([a], [b]) => b.localeCompare(a)) as [day, items] (day)}
          <div class="border-l-2 border-indigo-500 pl-4 py-2">
            <!-- Day Header -->
            <div class="text-sm font-semibold text-neutral-100 mb-2">
              📅 {new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>

            <!-- Grouped by Session -->
            <div class="space-y-2">
              {#each Object.entries(groupBySession(items)) as [sid, sessionItems] (sid)}
                <div class="ml-2 space-y-1 bg-neutral-800/30 rounded p-2 border border-neutral-700/50">
                  {#if sid !== 'no-session'}
                    <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">
                      📊 Session: {sid} ({sessionItems.length})
                    </div>
                  {/if}

                  {#each sessionItems as item (item.id)}
                    <div 
                      class="flex items-start gap-2 p-2 rounded hover:bg-neutral-700/30 transition-colors cursor-pointer text-xs"
                      on:click={() => goto(`/manifold/thoughts/${item.id}`)}
                    >
                      <span class="text-neutral-500 flex-shrink-0 mt-0.5">{typeIcon(item.type)}</span>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-neutral-200 truncate">
                          {item.title}
                        </div>
                        <div class="text-neutral-500 flex items-center gap-2 mt-0.5">
                          <span class="px-1.5 py-0.5 bg-neutral-700/50 rounded">{item.type}</span>
                          <span class="px-1.5 py-0.5 bg-neutral-700/50 rounded">{item.status}</span>
                          {#if item.confidence_score}
                            <span class="px-1.5 py-0.5 bg-indigo-950/50 rounded text-indigo-300">
                              {Math.round(item.confidence_score * 100)}%
                            </span>
                          {/if}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </GlassPanel>
  {:else}
    <GlassPanel title="📅 Results" emptyMessage="No thoughts found" />
  {/if}
</div>

<style>
  :global(input[type="date"]) {
    color-scheme: dark;
  }
</style>



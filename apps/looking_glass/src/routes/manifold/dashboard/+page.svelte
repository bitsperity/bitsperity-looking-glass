<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchDashboard } from '$lib/services/manifoldService';
  import KpiCard from '$lib/components/manifold/KpiCard.svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import WorkspaceCard from '$lib/components/manifold/WorkspaceCard.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  import * as api from '$lib/api/manifold';
  import { goto } from '$app/navigation';

  let loading = true;
  let data: any = {};
  let error: string | null = null;
  let workspaces: any[] = [];
  let duplicateWarnings: any[] = [];
  let timelineData: any = {};

  onMount(async () => {
    try {
      const [dashboard, workspacesResp, warningsResp, timeline] = await Promise.all([
        fetchDashboard(),
        api.getWorkspaces(10),
        api.getDuplicateWarnings(0.92, 5),
        api.timeline({ type: undefined, tickers: undefined }),
      ]);
      
      data = dashboard;
      workspaces = workspacesResp.workspaces || [];
      duplicateWarnings = warningsResp.duplicates || [];
      timelineData = timeline || {};
    } catch (e: any) {
      error = e?.message ?? 'Error loading dashboard';
    } finally {
      loading = false;
    }
  });

  function openWorkspaceSearch(workspaceId: string) {
    goto(`/manifold/search?workspace_id=${encodeURIComponent(workspaceId)}`);
  }

  function openWorkspaceGraph(workspaceId: string) {
    goto(`/manifold/graph?workspace_id=${encodeURIComponent(workspaceId)}`);
  }

  $: timelineEntries = Object.entries(timelineData.bucketed || {}).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14);
  $: maxCount = Math.max(...timelineEntries.map(([, items]) => (items as any[]).length), 1);
</script>

<div class="p-6 space-y-6 h-full overflow-auto">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
      Manifold · Command Center
    </h1>
  </div>
  
  <ManifoldNav />

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <GlassPanel loading={true} />
      <GlassPanel loading={true} />
      <GlassPanel loading={true} />
    </div>
    <GlassPanel title="📁 Active Workspaces" loading={true} />
  {:else if error}
    <GlassPanel error={error} title="❌ Error" />
  {:else}
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KpiCard 
        title="Health" 
        value={data.health?.status ?? '?'} 
        subtitle="Qdrant: {data.health?.qdrant_connected ? 'connected' : 'down'} · Collection: {data.health?.collection_name}"
        icon="✓"
      />

      <KpiCard 
        title="Device" 
        value={data.device?.cuda_available ? '🚀 GPU' : 'CPU'} 
        subtitle="{data.device?.gpu_name || 'CPU mode'} · {data.device?.model_device}"
      />

      <KpiCard 
        title="Thoughts" 
        value={data.statsAll?.total ?? 0} 
        subtitle="Avg confidence: {Math.round((data.statsAll?.avg_confidence ?? 0) * 100)}% · Validation rate: {Math.round((data.statsAll?.validation_rate ?? 0) * 100)}%"
        icon="💭"
      />
    </div>

    <!-- Workspaces Panel -->
    {#if workspaces.length > 0}
      <GlassPanel title="📁 Active Workspaces">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {#each workspaces as workspace (workspace.workspace_id)}
            <WorkspaceCard 
              {workspace}
              onOpenSearch={openWorkspaceSearch}
              onOpenGraph={openWorkspaceGraph}
            />
          {/each}
        </div>
        <div class="mt-4">
          <a 
            href="/manifold/workspaces"
            class="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all workspaces →
          </a>
        </div>
      </GlassPanel>
    {:else}
      <GlassPanel title="📁 Active Workspaces" emptyMessage="No active workspaces yet" />
    {/if}

    <!-- Duplicate Warnings KPI -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <GlassPanel title="⚠️ Duplicate Warnings">
        <div class="space-y-3">
          <div class="text-3xl font-bold text-amber-400">
            {duplicateWarnings.length}
          </div>
          <div class="text-sm text-neutral-400">
            potential duplicates detected
          </div>
          {#if duplicateWarnings.length > 0}
            <button 
              class="w-full px-3 py-2 rounded bg-amber-700 hover:bg-amber-600 text-sm font-medium text-white transition-colors"
              on:click={() => goto('/manifold/admin')}
            >
              Review in Admin
            </button>
          {/if}
        </div>
      </GlassPanel>

      <!-- Timeline Mini (last 14 days) -->
      <GlassPanel title="📈 Timeline (14d)">
        <div class="flex items-end gap-1 h-20">
          {#each timelineEntries as [date, items] (date)}
            <div 
              class="flex-1 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t transition-all hover:from-indigo-400 hover:to-indigo-300"
              style="height: {(items.length / maxCount) * 100}%"
              title="{date}: {items.length} thoughts"
            />
          {/each}
        </div>
        <div class="text-xs text-neutral-500 mt-2 text-right">
          {timelineEntries[0]?.[0] ?? 'N/A'} → {timelineEntries[timelineEntries.length - 1]?.[0] ?? 'N/A'}
        </div>
      </GlassPanel>
    </div>

    <!-- Stats by Type & Status -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <GlassPanel title="By Type">
        <div class="space-y-2">
          {#each Object.entries(data.statsAll?.by_type || {}) as [type, count] (type)}
            <div class="flex items-center justify-between">
              <span class="text-sm text-neutral-300 capitalize">{type}</span>
              <span class="text-sm font-semibold text-indigo-400">{count}</span>
            </div>
          {/each}
        </div>
      </GlassPanel>

      <GlassPanel title="By Status">
        <div class="space-y-2">
          {#each Object.entries(data.statsAll?.by_status || {}) as [status, count] (status)}
            <div class="flex items-center justify-between">
              <span class="text-sm text-neutral-300 capitalize">{status}</span>
              <span class="text-sm font-semibold text-emerald-400">{count}</span>
            </div>
          {/each}
        </div>
      </GlassPanel>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.4) 100%);
  }
</style>



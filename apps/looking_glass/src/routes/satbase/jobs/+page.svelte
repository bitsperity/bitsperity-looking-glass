<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { apiGet, apiPost } from '$lib/api/client';
  import Card from '$lib/components/shared/Card.svelte';
  import Button from '$lib/components/shared/Button.svelte';
  import Input from '$lib/components/shared/Input.svelte';
  import Badge from '$lib/components/shared/Badge.svelte';
  
  type Job = {
    job_id: string;
    status: 'queued' | 'running' | 'done' | 'error' | 'not_found' | 'timeout' | 'cancelled';
    kind: string;
    payload?: any;
    result?: any;
    error?: string;
  };
  
  let jobs: Job[] = [];
  let filteredJobs: Job[] = [];
  let statusFilter: string = 'all';
  let autoRefresh: boolean = true;
  let refreshInterval: number = 2000; // 2 seconds
  let timer: any;
  let loading: boolean = false;
  let error: string | null = null;
  
  // Quick actions state
  let newPricesTickers: string = '';
  let newMacroSeries: string = '';
  let newNewsQuery: string = '';
  let newNewsHours: number = 24;
  let actionLoading: boolean = false;
  let cleanupLoading: boolean = false;
  
  // Expanded job details
  let expandedJobId: string | null = null;
  
  async function loadJobs() {
    loading = true;
    error = null;
    
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (statusFilter !== 'all') {
        params.set('status_filter', statusFilter);
      }
      
      const res = await apiGet<{ count: number; jobs: Job[] }>(`/v1/ingest/jobs?${params.toString()}`);
      jobs = res.jobs || [];
      filterJobs();
    } catch (e: any) {
      error = e?.message || String(e);
    } finally {
      loading = false;
    }
  }
  
  function filterJobs() {
    if (statusFilter === 'all') {
      filteredJobs = jobs;
    } else {
      filteredJobs = jobs.filter(j => j.status === statusFilter);
    }
  }
  
  async function cleanupStaleJobs() {
    cleanupLoading = true;
    error = null;
    
    try {
      const res = await apiPost<{ cleaned: number; jobs: string[]; message: string }>('/v1/ingest/jobs/cleanup', {});
      await loadJobs();
      if (res.cleaned > 0) {
        error = `✓ ${res.message}`;
        setTimeout(() => error = null, 3000);
      }
    } catch (e) {
      error = `Failed to cleanup jobs: ${String(e)}`;
    } finally {
      cleanupLoading = false;
    }
  }
  
  function startAutoRefresh() {
    if (timer) clearInterval(timer);
    if (autoRefresh) {
      timer = setInterval(loadJobs, refreshInterval);
    }
  }
  
  async function triggerPricesIngest() {
    if (!newPricesTickers.trim()) return;
    
    actionLoading = true;
    try {
      const tickers = newPricesTickers.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
      await apiPost('/v1/ingest/prices/daily', { tickers });
      newPricesTickers = '';
      await loadJobs();
    } catch (e) {
      error = `Failed to trigger prices ingest: ${String(e)}`;
    } finally {
      actionLoading = false;
    }
  }
  
  async function triggerMacroIngest() {
    if (!newMacroSeries.trim()) return;
    
    actionLoading = true;
    try {
      const series = newMacroSeries.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
      await apiPost('/v1/ingest/macro/fred', { series });
      newMacroSeries = '';
      await loadJobs();
    } catch (e) {
      error = `Failed to trigger macro ingest: ${String(e)}`;
    } finally {
      actionLoading = false;
    }
  }
  
  async function triggerNewsIngest() {
    if (!newNewsQuery.trim()) return;
    
    actionLoading = true;
    try {
      await apiPost('/v1/ingest/news', { query: newNewsQuery, hours: newNewsHours });
      newNewsQuery = '';
      await loadJobs();
    } catch (e) {
      error = `Failed to trigger news ingest: ${String(e)}`;
    } finally {
      actionLoading = false;
    }
  }
  
  function toggleJobDetails(jobId: string) {
    expandedJobId = expandedJobId === jobId ? null : jobId;
  }
  
  function getStatusVariant(status: string): 'primary' | 'secondary' | 'success' | 'danger' | 'warning' {
    switch (status) {
      case 'queued': return 'secondary';
      case 'running': return 'warning';
      case 'done': return 'success';
      case 'error': return 'danger';
      case 'timeout': return 'danger';
      case 'cancelled': return 'secondary';
      default: return 'secondary';
    }
  }
  
  function getStatusIcon(status: string): string {
    switch (status) {
      case 'queued': return '⏳';
      case 'running': return '🔄';
      case 'done': return '✓';
      case 'error': return '✗';
      case 'timeout': return '⏱';
      case 'cancelled': return '⊗';
      default: return '?';
    }
  }
  
  onMount(() => {
    loadJobs();
    startAutoRefresh();
  });
  
  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
  
  // Reactive filters
  $: statusFilter, filterJobs();
  $: autoRefresh, startAutoRefresh();
  
  // Stats
  $: totalJobs = jobs.length;
  $: queuedJobs = jobs.filter(j => j.status === 'queued').length;
  $: runningJobs = jobs.filter(j => j.status === 'running').length;
  $: doneJobs = jobs.filter(j => j.status === 'done').length;
  $: errorJobs = jobs.filter(j => j.status === 'error').length;
  $: cleanedJobs = jobs.filter(j => j.status === 'timeout' || j.status === 'cancelled').length;
</script>

<div class="max-w-7xl mx-auto space-y-6 h-full overflow-y-auto p-6">
  <!-- Header with Stats -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-neutral-100">Ingest Jobs</h1>
      <p class="text-sm text-neutral-400 mt-1">Real-time job monitoring and management</p>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="secondary">{totalJobs} total</Badge>
      {#if queuedJobs > 0}
        <Badge variant="secondary">{queuedJobs} queued</Badge>
      {/if}
      {#if runningJobs > 0}
        <Badge variant="warning">{runningJobs} running</Badge>
      {/if}
      {#if doneJobs > 0}
        <Badge variant="success">{doneJobs} done</Badge>
      {/if}
      {#if errorJobs > 0}
        <Badge variant="danger">{errorJobs} errors</Badge>
      {/if}
      {#if cleanedJobs > 0}
        <Badge variant="secondary">🧹 {cleanedJobs} cleaned</Badge>
      {/if}
    </div>
  </div>
  
  <!-- Quick Actions -->
  <Card>
    <h2 class="text-lg font-semibold text-neutral-100 mb-4">Quick Actions</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Trigger Prices Ingest -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-neutral-300">Prices (EOD)</label>
        <div class="flex gap-2">
          <Input 
            placeholder="TSM, NVDA, AAPL"
            bind:value={newPricesTickers}
            disabled={actionLoading}
            classes="flex-1"
          />
          <Button 
            variant="primary" 
            size="sm" 
            on:click={triggerPricesIngest}
            disabled={!newPricesTickers.trim() || actionLoading}
          >
            Ingest
          </Button>
        </div>
      </div>
      
      <!-- Trigger Macro Ingest -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-neutral-300">Macro (FRED)</label>
        <div class="flex gap-2">
          <Input 
            placeholder="CPIAUCSL, GDP"
            bind:value={newMacroSeries}
            disabled={actionLoading}
            classes="flex-1"
          />
          <Button 
            variant="primary" 
            size="sm" 
            on:click={triggerMacroIngest}
            disabled={!newMacroSeries.trim() || actionLoading}
          >
            Ingest
          </Button>
        </div>
      </div>
      
      <!-- Trigger News Ingest -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-neutral-300">News (GDELT)</label>
        <div class="flex gap-2">
          <Input 
            placeholder="semiconductor"
            bind:value={newNewsQuery}
            disabled={actionLoading}
            classes="flex-1"
          />
          <Input 
            type="number"
            bind:value={newNewsHours}
            disabled={actionLoading}
            classes="w-16"
          />
          <Button 
            variant="primary" 
            size="sm" 
            on:click={triggerNewsIngest}
            disabled={!newNewsQuery.trim() || actionLoading}
          >
            Ingest
          </Button>
        </div>
      </div>
    </div>
  </Card>
  
  <!-- Controls -->
  <Card>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input 
            type="checkbox" 
            bind:checked={autoRefresh}
            class="rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50" 
          />
          <span class="text-neutral-300">Auto-refresh ({refreshInterval/1000}s)</span>
        </label>
        
        <div class="flex items-center gap-2">
          <span class="text-sm text-neutral-400">Filter:</span>
          <select 
            bind:value={statusFilter}
            class="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="done">Done</option>
            <option value="error">Error</option>
            <option value="timeout">Timeout</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" on:click={cleanupStaleJobs} loading={cleanupLoading}>
          {cleanupLoading ? 'Cleaning...' : 'Cleanup Stuck Jobs'}
        </Button>
        <Button variant="secondary" size="sm" on:click={loadJobs} loading={loading}>
          {loading ? 'Refreshing...' : 'Refresh Now'}
        </Button>
      </div>
    </div>
  </Card>
  
  <!-- Error/Success Message -->
  {#if error}
    <div class="{error.startsWith('✓') ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'} border rounded-lg p-3 text-sm">
      {error}
    </div>
  {/if}
  
  <!-- Jobs List -->
  <Card padding="p-0">
    <div class="divide-y divide-neutral-700/30">
      {#if filteredJobs.length === 0}
        <div class="text-center py-12 text-neutral-500">
          <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p class="text-sm">
            {statusFilter === 'all' ? 'No jobs found' : `No ${statusFilter} jobs`}
          </p>
          <p class="text-xs text-neutral-600 mt-1">Trigger a new ingest job above</p>
        </div>
      {:else}
        {#each filteredJobs as job}
          <div class="p-4 hover:bg-neutral-800/30 transition-colors {job.status === 'timeout' || job.status === 'cancelled' ? 'bg-orange-900/10 border-l-4 border-orange-500/40' : ''}">
            <button 
              on:click={() => toggleJobDetails(job.job_id)}
              class="w-full text-left"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-3 mb-2">
                    <span class="text-2xl">{getStatusIcon(job.status)}</span>
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-sm text-neutral-400">{job.job_id.slice(0, 8)}...</span>
                        <Badge variant={getStatusVariant(job.status)} size="sm">
                          {job.status}
                        </Badge>
                        {#if job.status === 'timeout' || job.status === 'cancelled'}
                          <span class="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded">
                            🧹 Cleaned
                          </span>
                        {/if}
                        <span class="text-sm text-neutral-300 font-medium">{job.kind}</span>
                      </div>
                      {#if job.payload}
                        <div class="text-xs text-neutral-500 mt-1">
                          {JSON.stringify(job.payload).slice(0, 100)}...
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
                <svg 
                  class="w-5 h-5 text-neutral-500 transition-transform {expandedJobId === job.job_id ? 'rotate-180' : ''}" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            <!-- Expanded Details -->
            {#if expandedJobId === job.job_id}
              <div class="mt-4 pt-4 border-t border-neutral-700/30 space-y-3">
                <div>
                  <div class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Full Job ID</div>
                  <div class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded">
                    {job.job_id}
                  </div>
                </div>
                
                {#if job.payload}
                  <div>
                    <div class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Payload</div>
                    <pre class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-3 rounded overflow-x-auto">{JSON.stringify(job.payload, null, 2)}</pre>
                  </div>
                {/if}
                
                {#if job.result}
                  <div>
                    <div class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Result</div>
                    <pre class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-3 rounded overflow-x-auto">{JSON.stringify(job.result, null, 2)}</pre>
                  </div>
                {/if}
                
                {#if job.error}
                  <div>
                    <div class="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Error</div>
                    <div class="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded">
                      {job.error}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </Card>
</div>


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
    created_at?: string;
    started_at?: string;
    completed_at?: string;
    progress_current?: number;
    progress_total?: number;
  };
  
  let jobs: Job[] = [];
  let activeJobs: Job[] = [];
  let completedJobs: Job[] = [];
  let failedJobs: Job[] = [];
  let autoRefresh: boolean = true;
  let refreshInterval: number = 2000;
  let timer: any;
  let loading: boolean = false;
  let error: string | null = null;
  
  // Quick actions
  let newPricesTickers: string = '';
  let newMacroSeries: string = '';
  let newNewsQuery: string = '';
  let newNewsHours: number = 24;
  let actionLoading: boolean = false;
  let cleanupLoading: boolean = false;
  let retryingJobId: string | null = null;
  
  // Expanded job details
  let expandedJobId: string | null = null;
  
  async function loadJobs() {
    loading = true;
    error = null;
    
    try {
      const res = await apiGet<{ count: number; jobs: Job[] }>(`/v1/ingest/jobs?limit=200`);
      jobs = res.jobs || [];
      categorizeJobs();
    } catch (e: any) {
      error = e?.message || String(e);
    } finally {
      loading = false;
    }
  }
  
  function categorizeJobs() {
    activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'running');
    completedJobs = jobs.filter(j => j.status === 'done');
    failedJobs = jobs.filter(j => j.status === 'error' || j.status === 'timeout' || j.status === 'cancelled');
  }
  
  function formatDuration(job: Job): string {
    if (!job.started_at) return '-';
    const start = new Date(job.started_at);
    const end = job.completed_at ? new Date(job.completed_at) : new Date();
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  
  function formatTime(isoString?: string): string {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  
  function getProgressPercent(job: Job): number | null {
    if (!job.progress_total || job.progress_total === 0) return null;
    return Math.round((job.progress_current || 0) / job.progress_total * 100);
  }
  
  async function retryJob(jobId: string, job: Job) {
    retryingJobId = jobId;
    try {
      // Recreate the job with the same params
      if (job.kind === 'prices_daily' && job.payload?.tickers) {
        await triggerPricesIngest(job.payload.tickers.join(', '));
      } else if (job.kind === 'macro_fred' && job.payload?.series) {
        await triggerMacroIngest(job.payload.series.join(', '));
      } else if (job.kind.includes('news') && job.payload?.query) {
        await apiPost('/v1/ingest/news/backfill', {
          query: job.payload.query,
          from: job.payload.from || new Date().toISOString().split('T')[0],
          to: job.payload.to || new Date().toISOString().split('T')[0]
        });
        await loadJobs();
      }
    } catch (e) {
      error = `Failed to retry job: ${String(e)}`;
    } finally {
      retryingJobId = null;
    }
  }
  
  async function cleanupStaleJobs() {
    cleanupLoading = true;
    error = null;
    try {
      const res = await apiPost<{ cleaned: number; message: string }>('/v1/ingest/jobs/cleanup', {});
      await loadJobs();
      error = `✓ ${res.message}`;
      setTimeout(() => error = null, 3000);
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
  
  async function triggerPricesIngest(tickers?: string) {
    const tickerStr = tickers || newPricesTickers.trim();
    if (!tickerStr) return;
    actionLoading = true;
    try {
      const tickerList = tickerStr.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
      await apiPost('/v1/ingest/prices/daily', { tickers: tickerList });
      newPricesTickers = '';
      await loadJobs();
    } catch (e) {
      error = `Failed to trigger prices ingest: ${String(e)}`;
    } finally {
      actionLoading = false;
    }
  }
  
  async function triggerMacroIngest(series?: string) {
    const seriesStr = series || newMacroSeries.trim();
    if (!seriesStr) return;
    actionLoading = true;
    try {
      const seriesList = seriesStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
      await apiPost('/v1/ingest/macro/fred', { series: seriesList });
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
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'queued': return 'bg-neutral-700/30 text-neutral-300';
      case 'running': return 'bg-yellow-500/20 text-yellow-300';
      case 'done': return 'bg-green-500/20 text-green-300';
      case 'error': return 'bg-red-500/20 text-red-300';
      default: return 'bg-neutral-700/30 text-neutral-300';
    }
  }
  
  // Stats calculations
  $: totalJobs = jobs.length;
  $: successRate = jobs.length > 0 ? Math.round(completedJobs.length / jobs.length * 100) : 0;
  $: avgDuration = completedJobs.length > 0
    ? completedJobs.reduce((sum, j) => {
        if (!j.started_at || !j.completed_at) return sum;
        const ms = new Date(j.completed_at).getTime() - new Date(j.started_at).getTime();
        return sum + ms;
      }, 0) / completedJobs.length / 1000
    : 0;
  
  onMount(() => {
    loadJobs();
    startAutoRefresh();
  });
  
  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
  
  $: autoRefresh, startAutoRefresh();
</script>

<div class="max-w-7xl mx-auto space-y-4 h-full overflow-y-auto p-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-neutral-100">🔧 Jobs Dashboard</h1>
      <p class="text-sm text-neutral-400 mt-1">Real-time job monitoring and management</p>
    </div>
    <div class="flex items-center gap-2">
      <label class="flex items-center gap-2 text-sm cursor-pointer">
        <input 
          type="checkbox" 
          bind:checked={autoRefresh}
          class="rounded border-neutral-600 bg-neutral-700 text-blue-600"
        />
        <span class="text-neutral-300">Auto-refresh</span>
      </label>
      <Button variant="secondary" size="sm" on:click={loadJobs} disabled={loading}>
        {loading ? '⟳' : '↻'} Refresh
      </Button>
    </div>
  </div>
  
  <!-- Stats Cards -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <Card padding="p-3">
      <div class="text-xs text-neutral-400 uppercase font-semibold">Total Jobs</div>
      <div class="text-2xl font-bold text-neutral-100 mt-1">{totalJobs}</div>
    </Card>
    <Card padding="p-3">
      <div class="text-xs text-neutral-400 uppercase font-semibold">Success Rate</div>
      <div class="text-2xl font-bold text-green-400 mt-1">{successRate}%</div>
    </Card>
    <Card padding="p-3">
      <div class="text-xs text-neutral-400 uppercase font-semibold">Avg Duration</div>
      <div class="text-2xl font-bold text-blue-400 mt-1">
        {avgDuration < 60 ? Math.round(avgDuration) + 's' : (avgDuration / 60).toFixed(1) + 'm'}
      </div>
    </Card>
    <Card padding="p-3">
      <div class="text-xs text-neutral-400 uppercase font-semibold">Failed</div>
      <div class="text-2xl font-bold {failedJobs.length > 0 ? 'text-red-400' : 'text-neutral-500'} mt-1">
        {failedJobs.length}
      </div>
    </Card>
  </div>
  
  <!-- Error Message -->
  {#if error}
    <div class="{error.startsWith('✓') ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'} border rounded-lg p-3 text-sm">
      {error}
    </div>
  {/if}
  
  <!-- Quick Actions -->
  <Card>
    <h2 class="text-lg font-semibold text-neutral-100 mb-4">📥 Quick Ingest</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="space-y-2">
        <label for="prices-input" class="text-sm font-medium text-neutral-300">💹 Prices (EOD)</label>
        <div class="flex gap-2">
          <input 
            id="prices-input"
            type="text"
            placeholder="TSM, NVDA, AAPL"
            bind:value={newPricesTickers}
            class="flex-1 text-sm bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-neutral-100"
          />
          <Button variant="primary" size="sm" on:click={() => triggerPricesIngest()} disabled={!newPricesTickers.trim() || actionLoading}>
            Ingest
          </Button>
        </div>
      </div>
      
      <div class="space-y-2">
        <label for="macro-input" class="text-sm font-medium text-neutral-300">📊 Macro (FRED)</label>
        <div class="flex gap-2">
          <input 
            id="macro-input"
            type="text"
            placeholder="CPIAUCSL, GDP"
            bind:value={newMacroSeries}
            class="flex-1 text-sm bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-neutral-100"
          />
          <Button variant="primary" size="sm" on:click={() => triggerMacroIngest()} disabled={!newMacroSeries.trim() || actionLoading}>
            Ingest
          </Button>
        </div>
      </div>
      
      <div class="space-y-2">
        <label for="news-input" class="text-sm font-medium text-neutral-300">📰 News (GDELT)</label>
        <div class="flex gap-2">
          <input 
            id="news-input"
            type="text"
            placeholder="semiconductor"
            bind:value={newNewsQuery}
            class="flex-1 text-sm bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-neutral-100"
          />
          <Button variant="primary" size="sm" on:click={triggerNewsIngest} disabled={!newNewsQuery.trim() || actionLoading}>
            Ingest
          </Button>
        </div>
      </div>
    </div>
  </Card>
  
  <!-- Active Jobs Section -->
  {#if activeJobs.length > 0}
    <Card>
      <h2 class="text-lg font-semibold text-neutral-100 mb-3">⚡ Active Jobs ({activeJobs.length})</h2>
      <div class="space-y-2">
        {#each activeJobs as job}
          <div class="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3 hover:bg-neutral-800/70 transition-colors">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="text-xl">{getStatusIcon(job.status)}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium text-sm text-neutral-100">{job.kind}</span>
                    <Badge variant={job.status === 'running' ? 'warning' : 'secondary'} size="sm">
                      {job.status}
                    </Badge>
                  </div>
                  {#if job.progress_total && job.progress_total > 0}
                    <div class="mt-2">
                      <div class="flex items-center justify-between text-xs text-neutral-400 mb-1">
                        <span>Progress</span>
                        <span>{job.progress_current || 0}/{job.progress_total}</span>
                      </div>
                      <div class="w-full bg-neutral-700/50 rounded-full h-1.5">
                        <div 
                          class="bg-blue-500 h-1.5 rounded-full" 
                          style="width: {getProgressPercent(job) || 0}%"
                        ></div>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
              <div class="text-xs text-neutral-400">
                {formatDuration(job)}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </Card>
  {/if}
  
  <!-- Completed Jobs Section -->
  {#if completedJobs.length > 0}
    <Card>
      <h2 class="text-lg font-semibold text-neutral-100 mb-3">✓ Completed Today ({completedJobs.length})</h2>
      <div class="space-y-2">
        {#each completedJobs.slice(0, 10) as job}
          <button 
            on:click={() => expandedJobId = expandedJobId === job.job_id ? null : job.job_id}
            class="w-full text-left bg-neutral-800/30 border border-neutral-700/30 rounded-lg p-3 hover:bg-neutral-800/50 transition-colors"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="text-xl">✓</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium text-sm text-neutral-100">{job.kind}</span>
                    <span class="text-xs text-neutral-500">{formatTime(job.started_at)}</span>
                  </div>
                  {#if job.result}
                    <div class="text-xs text-neutral-500 mt-1">
                      {#if typeof job.result === 'object'}
                        {JSON.stringify(job.result).slice(0, 80)}...
                      {:else}
                        {job.result}
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-neutral-400 font-mono">{formatDuration(job)}</span>
                <svg class="w-4 h-4 text-neutral-500 transition-transform {expandedJobId === job.job_id ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {#if expandedJobId === job.job_id}
              <div class="mt-3 pt-3 border-t border-neutral-700/30 space-y-2">
                <div>
                  <div class="text-xs font-semibold text-neutral-400 mb-1">Job ID</div>
                  <div class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded">{job.job_id}</div>
                </div>
                {#if job.result}
                  <div>
                    <div class="text-xs font-semibold text-neutral-400 mb-1">Result</div>
                    <pre class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded overflow-x-auto">{JSON.stringify(job.result, null, 2)}</pre>
                  </div>
                {/if}
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </Card>
  {/if}
  
  <!-- Failed Jobs Section -->
  {#if failedJobs.length > 0}
    <Card>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-red-300">⚠️ Failed Jobs ({failedJobs.length})</h2>
        <Button variant="secondary" size="sm" on:click={cleanupStaleJobs} disabled={cleanupLoading}>
          🧹 Cleanup
        </Button>
      </div>
      <div class="space-y-2">
        {#each failedJobs as job}
          <button 
            on:click={() => expandedJobId = expandedJobId === job.job_id ? null : job.job_id}
            class="w-full text-left bg-red-500/10 border border-red-500/20 rounded-lg p-3 hover:bg-red-500/20 transition-colors"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="text-xl">{getStatusIcon(job.status)}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium text-sm text-red-300">{job.kind}</span>
                    <Badge variant="secondary" size="sm">{job.status}</Badge>
                  </div>
                  {#if job.error}
                    <div class="text-xs text-red-400 mt-1 line-clamp-1">{job.error.slice(0, 100)}</div>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Button 
                  variant="primary" 
                  size="sm" 
                  on:click={() => retryJob(job.job_id, job)}
                  disabled={retryingJobId === job.job_id}
                >
                  {retryingJobId === job.job_id ? '⟳' : '↻'} Retry
                </Button>
                <svg class="w-4 h-4 text-neutral-500 transition-transform {expandedJobId === job.job_id ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {#if expandedJobId === job.job_id}
              <div class="mt-3 pt-3 border-t border-neutral-700/30 space-y-2">
                <div>
                  <div class="text-xs font-semibold text-neutral-400 mb-1">Job ID</div>
                  <div class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded">{job.job_id}</div>
                </div>
                {#if job.payload}
                  <div>
                    <div class="text-xs font-semibold text-neutral-400 mb-1">Payload</div>
                    <pre class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded overflow-x-auto">{JSON.stringify(job.payload, null, 2)}</pre>
                  </div>
                {/if}
                {#if job.error}
                  <div>
                    <div class="text-xs font-semibold text-red-400 mb-1">Error</div>
                    <div class="text-xs text-red-300 bg-red-500/10 border border-red-500/20 p-2 rounded">{job.error}</div>
                  </div>
                {/if}
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </Card>
  {/if}
  
  {#if jobs.length === 0 && !loading}
    <Card padding="p-12">
      <div class="text-center">
        <div class="text-4xl mb-3">📭</div>
        <p class="text-neutral-400">No jobs yet. Trigger an ingest above to get started.</p>
      </div>
    </Card>
  {/if}
</div>


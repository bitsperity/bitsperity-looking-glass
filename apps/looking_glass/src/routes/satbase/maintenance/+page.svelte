<script lang="ts">
  import { onMount } from 'svelte';
  import { getGaps, type GapResponse } from '$lib/api/satbase';
  import { apiPost } from '$lib/api/client';
  import Card from '$lib/components/shared/Card.svelte';
  import Badge from '$lib/components/shared/Badge.svelte';
  import Button from '$lib/components/shared/Button.svelte';
  
  let gapData: GapResponse | null = null;
  let loading = false;
  let error: string | null = null;
  
  // Date filters
  const today = new Date().toISOString().slice(0, 10);
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  let dateFrom = oneYearAgo;
  let dateTo = today;
  let minArticlesPerDay = 10;
  
  // Backfill state
  let selectedGaps: Set<string> = new Set();
  let backfillQuery = 'semiconductor OR chip';
  let backfilling = false;
  let backfillMessage: string | null = null;
  
  async function detectGaps() {
    loading = true;
    error = null;
    try {
      gapData = await getGaps({
        from: dateFrom,
        to: dateTo,
        min_articles_per_day: minArticlesPerDay
      });
    } catch (e) {
      error = `Failed to detect gaps: ${String(e)}`;
    } finally {
      loading = false;
    }
  }
  
  async function startBackfill() {
    if (selectedGaps.size === 0) {
      error = 'Please select at least one gap to backfill';
      return;
    }
    
    backfilling = true;
    backfillMessage = null;
    
    try {
      const gapDates = Array.from(selectedGaps);
      const fromDate = gapDates[0];
      const toDate = gapDates[gapDates.length - 1];
      
      const res = await apiPost<{ job_id: string; status: string }>('/v1/ingest/news', {
        query: backfillQuery,
        from: fromDate,
        to: toDate
      });
      
      backfillMessage = `✓ Backfill job started: ${res.job_id}\nFetching news for ${gapDates.length} dates from ${fromDate} to ${toDate}`;
      selectedGaps.clear();
    } catch (e) {
      backfillMessage = `✗ Error: ${String(e)}`;
    } finally {
      backfilling = false;
    }
  }
  
  function toggleGapSelection(date: string) {
    if (selectedGaps.has(date)) {
      selectedGaps.delete(date);
    } else {
      selectedGaps.add(date);
    }
    selectedGaps = selectedGaps;
  }
  
  function selectAllGaps() {
    if (gapData?.gaps) {
      gapData.gaps.forEach(gap => selectedGaps.add(gap.date));
      selectedGaps = selectedGaps;
    }
  }
  
  function deselectAllGaps() {
    selectedGaps.clear();
    selectedGaps = selectedGaps;
  }
  
  onMount(() => {
    detectGaps();
  });
</script>

<div class="space-y-6 p-6 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-neutral-100">Data Maintenance</h1>
      <p class="text-sm text-neutral-400 mt-1">Detect coverage gaps and trigger intelligent backfill</p>
    </div>
  </div>

  {#if error && !gapData}
    <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-400">
      {error}
    </div>
  {/if}

  <!-- Gap Detection Controls -->
  <Card>
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-neutral-100">Find Coverage Gaps</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-2">From Date</label>
          <input
            type="date"
            bind:value={dateFrom}
            class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-100"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-2">To Date</label>
          <input
            type="date"
            bind:value={dateTo}
            class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-100"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-2">Min Articles/Day</label>
          <input
            type="number"
            bind:value={minArticlesPerDay}
            min="1"
            max="100"
            class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-100"
          />
        </div>
        
        <div class="flex items-end">
          <Button
            variant="primary"
            {loading}
            on:click={detectGaps}
            classes="w-full"
          >
            {loading ? 'Scanning...' : 'Detect Gaps'}
          </Button>
        </div>
      </div>
    </div>
  </Card>

  {#if loading && !gapData}
    <div class="flex items-center justify-center py-12">
      <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  {/if}

  {#if gapData}
    <!-- Coverage Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 rounded-xl p-6">
        <div class="text-sm font-medium text-neutral-400 mb-2">Total Days</div>
        <div class="text-3xl font-bold text-neutral-100">{gapData.coverage.total_days}</div>
      </div>
      
      <div class="bg-gradient-to-br from-emerald-900/20 to-emerald-900/10 border border-emerald-700/30 rounded-xl p-6">
        <div class="text-sm font-medium text-emerald-400 mb-2">Covered Days</div>
        <div class="text-3xl font-bold text-emerald-300">{gapData.coverage.covered_days}</div>
        <div class="text-xs text-emerald-500 mt-2">{gapData.coverage.coverage_percent}% coverage</div>
      </div>
      
      <div class="bg-gradient-to-br from-amber-900/20 to-amber-900/10 border border-amber-700/30 rounded-xl p-6">
        <div class="text-sm font-medium text-amber-400 mb-2">Gap Days</div>
        <div class="text-3xl font-bold text-amber-300">{gapData.coverage.gap_days}</div>
        <div class="text-xs text-amber-500 mt-2">need backfill</div>
      </div>
      
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 rounded-xl p-6">
        <div class="text-sm font-medium text-neutral-400 mb-2">Threshold</div>
        <div class="text-3xl font-bold text-neutral-100">{gapData.min_articles_threshold}</div>
        <div class="text-xs text-neutral-500 mt-2">articles/day</div>
      </div>
    </div>

    <!-- Backfill Section -->
    {#if gapData.gaps && gapData.gaps.length > 0}
      <Card>
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-neutral-100">Smart Backfill</h2>
          
          <!-- Backfill Query -->
          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-2">Query (e.g., "semiconductor OR chip")</label>
            <input
              type="text"
              bind:value={backfillQuery}
              placeholder="Enter search query for backfill"
              class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-100 placeholder-neutral-600"
            />
          </div>
          
          <!-- Backfill Message -->
          {#if backfillMessage}
            <div class="p-3 rounded-lg {backfillMessage.startsWith('✓') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'} text-sm whitespace-pre-wrap">
              {backfillMessage}
            </div>
          {/if}
          
          <!-- Selected Gaps Info -->
          <div class="bg-neutral-800/50 rounded-lg p-3">
            <div class="text-sm text-neutral-300 mb-2">
              Selected: <span class="font-semibold text-blue-400">{selectedGaps.size}</span> / {gapData.gaps.length} gaps
            </div>
            <div class="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                on:click={selectAllGaps}
                disabled={selectedGaps.size === gapData.gaps.length}
              >
                Select All
              </Button>
              <Button
                variant="secondary"
                size="sm"
                on:click={deselectAllGaps}
                disabled={selectedGaps.size === 0}
              >
                Deselect All
              </Button>
            </div>
          </div>
          
          <!-- Backfill Button -->
          <div class="flex gap-2 pt-2">
            <Button
              variant="primary"
              loading={backfilling}
              disabled={selectedGaps.size === 0 || !backfillQuery.trim()}
              on:click={startBackfill}
            >
              {backfilling ? 'Starting Backfill...' : `Start Backfill (${selectedGaps.size} gaps)`}
            </Button>
          </div>
        </div>
      </Card>
    {/if}

    <!-- Gaps List -->
    <Card padding="p-0">
      <div class="divide-y divide-neutral-700/30">
        <div class="p-4 bg-neutral-800/30 sticky top-0">
          <h3 class="font-semibold text-neutral-100">Coverage Gaps ({gapData.gaps?.length || 0})</h3>
        </div>
        
        {#if gapData.gaps && gapData.gaps.length > 0}
          <div class="divide-y divide-neutral-700/30">
            {#each gapData.gaps as gap}
              <div
                class="p-4 hover:bg-neutral-800/30 transition-colors cursor-pointer {selectedGaps.has(gap.date) ? 'bg-blue-900/10 border-l-4 border-blue-500' : ''}"
                on:click={() => toggleGapSelection(gap.date)}
              >
                <div class="flex items-center gap-4">
                  <!-- Checkbox -->
                  <input
                    type="checkbox"
                    checked={selectedGaps.has(gap.date)}
                    on:click|stopPropagation={() => toggleGapSelection(gap.date)}
                    class="rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  />
                  
                  <!-- Date -->
                  <div class="font-mono text-sm font-semibold text-neutral-300 min-w-[120px]">
                    {gap.date}
                  </div>
                  
                  <!-- Article Count -->
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-neutral-400">Articles:</span>
                    <Badge
                      variant={gap.gap_severity === 'critical' ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {gap.article_count}
                    </Badge>
                  </div>
                  
                  <!-- Severity -->
                  <div class="ml-auto">
                    <Badge
                      variant={gap.gap_severity === 'critical' ? 'danger' : 'warning'}
                    >
                      {gap.gap_severity === 'critical' ? 'No Articles' : 'Low Coverage'}
                    </Badge>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="p-8 text-center text-neutral-500">
            <p class="text-sm">No coverage gaps found! ✓</p>
            <p class="text-xs mt-1">Your data coverage looks good.</p>
          </div>
        {/if}
      </div>
    </Card>
  {/if}
</div>

<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { coalescenceClient, type RunDetail } from '$lib/coalescence-client';
  import StatusBadge from '$lib/components/coalescence/StatusBadge.svelte';
  import CostDisplay from '$lib/components/coalescence/CostDisplay.svelte';
  import TokenDisplay from '$lib/components/coalescence/TokenDisplay.svelte';
  import ToolCallDisplay from '$lib/components/coalescence/ToolCallDisplay.svelte';

  let run: RunDetail | null = null;
  let loading = true;
  let error: string | null = null;
  let expandedTools: Set<number> = new Set();

  const runId = $page.params.id;

  async function loadRun() {
    try {
      loading = true;
      error = null;
      run = await coalescenceClient.getRun(runId);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load run';
    } finally {
      loading = false;
    }
  }

  function toggleToolExpanded(toolIndex: number) {
    if (expandedTools.has(toolIndex)) {
      expandedTools.delete(toolIndex);
    } else {
      expandedTools.add(toolIndex);
    }
    expandedTools = expandedTools; // Trigger reactivity
  }

  function formatTime(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  }

  function formatRelativeTime(isoString: string) {
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  }

  onMount(() => {
    loadRun();
    const interval = setInterval(loadRun, 5000);
    return () => clearInterval(interval);
  });
</script>

<div class="flex-1 overflow-auto px-6 pb-6">
  {#if loading}
    <div class="flex items-center justify-center h-64 text-neutral-400">
      <div>Loading run details...</div>
    </div>
  {:else if error}
    <div class="text-red-400 py-8">{error}</div>
  {:else if run}
    <!-- Metadata Header -->
    <div class="bg-neutral-800 border border-neutral-700 rounded p-6 mb-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="text-xl font-bold">{run.meta.agent}</span>
            <StatusBadge status={run.meta.status === 'success' ? 'success' : run.meta.status === 'error' ? 'error' : 'running'} />
          </div>
          <div class="text-sm text-neutral-400">{run.meta.runId}</div>
        </div>
        <button
          on:click={loadRun}
          class="px-3 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-4 gap-4">
        <div>
          <div class="text-xs text-neutral-400 mb-1">Model</div>
          <div class="font-semibold">{run.meta.model || 'Unknown'}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-400 mb-1">Tokens</div>
          <div class="font-semibold"><TokenDisplay tokens={run.tokens} /></div>
        </div>
        <div>
          <div class="text-xs text-neutral-400 mb-1">Cost</div>
          <div class="font-semibold"><CostDisplay cost={run.cost.usd} /></div>
        </div>
        <div>
          <div class="text-xs text-neutral-400 mb-1">Duration</div>
          <div class="font-semibold">{run.meta.durationSeconds ? `${run.meta.durationSeconds}s` : 'N/A'}</div>
        </div>
      </div>

      <!-- Execution Summary -->
      <div class="mt-4 pt-4 border-t border-neutral-700 text-sm">
        <span class="text-neutral-400">
          {run.execution.turnsCompleted}/{run.execution.turnsTotal} turns completed
          · {run.execution.totalToolCalls} tool calls
        </span>
      </div>
    </div>

    <!-- Chat Display -->
    <div class="space-y-6">
      {#each run.turns as turn}
        <div class="border border-neutral-700 rounded bg-neutral-800/30 overflow-hidden">
          <!-- Turn Header -->
          <div class="px-4 py-3 border-b border-neutral-700 bg-neutral-800">
            <div class="font-semibold">
              Turn {turn.number}: {turn.name}
              <span class="text-sm text-neutral-400 ml-2">
                {turn.duration.ms}ms
                · <TokenDisplay tokens={turn.tokens} />
                · <CostDisplay cost={turn.cost} showDetail={false} />
              </span>
            </div>
            {#if turn.status !== 'success'}
              <StatusBadge status={turn.status === 'error' ? 'error' : 'running'} />
            {/if}
          </div>

          <!-- Messages and Tool Calls -->
          <div class="px-4 py-4 space-y-4">
            {#each turn.messages as message, msgIdx}
              <div class="flex gap-3">
                <div class="text-2xl w-8 flex-shrink-0">
                  {#if message.role === 'user'}
                    💬
                  {:else if message.role === 'assistant'}
                    🤖
                  {:else}
                    ⚙️
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-neutral-400 mb-1">
                    {message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Assistant' : 'System'}
                    · {formatRelativeTime(message.timestamp)}
                  </div>
                  <div class="text-sm text-neutral-200 break-words whitespace-pre-wrap">
                    {message.content.substring(0, 300)}{message.content.length > 300 ? '...' : ''}
                  </div>
                </div>
              </div>

              <!-- Tool Calls After This Message (if any) -->
              {#if msgIdx === turn.messages.length - 1 && turn.toolCalls.length > 0}
                <div class="space-y-3 mt-4 pl-11">
                  <div class="text-xs font-semibold text-neutral-400 uppercase">Tool Calls</div>
                  {#each turn.toolCalls as toolCall, toolIdx}
                    <ToolCallDisplay
                      {toolCall}
                      expanded={expandedTools.has(toolIdx)}
                      on:click={() => toggleToolExpanded(toolIdx)}
                    />
                  {/each}
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>


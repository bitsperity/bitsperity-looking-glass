<script lang="ts">
  import type { ToolCall } from '$lib/coalescence-client';
  import StatusBadge from './StatusBadge.svelte';

  export let toolCall: ToolCall;
  export let expanded = false;

  const statusMap: Record<string, 'success' | 'error' | 'pending'> = {
    success: 'success',
    error: 'error',
    pending: 'pending'
  };

  const formatJson = (obj: any) => JSON.stringify(obj, null, 2);
  const getToolMcp = (name: string) => name.split('_')[0];
</script>

<div class="border border-neutral-700 rounded bg-neutral-800/50 overflow-hidden">
  <!-- Header -->
  <button
    on:click={() => (expanded = !expanded)}
    class="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-700/50 transition-colors text-left"
  >
    <!-- Expand Toggle -->
    <span class="text-neutral-400 text-xs w-4">
      {expanded ? '▼' : '▶'}
    </span>

    <!-- Tool Info -->
    <div class="flex-1">
      <div class="flex items-center gap-2 mb-1">
        <span class="font-semibold">{toolCall.name}</span>
        <StatusBadge status={statusMap[toolCall.status] || 'pending'} />
        <span class="text-xs text-neutral-400">{toolCall.duration.ms}ms</span>
      </div>
      {#if toolCall.error}
        <div class="text-xs text-red-400">{toolCall.error.substring(0, 100)}</div>
      {/if}
    </div>

    <!-- MCP Badge -->
    <span class="text-xs px-2 py-1 bg-neutral-700 text-neutral-300 rounded">
      {getToolMcp(toolCall.name)}
    </span>
  </button>

  <!-- Expandable Content -->
  {#if expanded}
    <div class="border-t border-neutral-700 bg-neutral-900/50">
      <!-- Args Section -->
      {#if Object.keys(toolCall.args).length > 0}
        <div class="px-4 py-3 border-b border-neutral-700">
          <div class="text-xs font-semibold text-neutral-400 mb-2">Arguments</div>
          <pre class="text-xs overflow-x-auto text-neutral-300 bg-neutral-900 p-2 rounded"><code>{formatJson(toolCall.args)}</code></pre>
        </div>
      {/if}

      <!-- Result Section -->
      {#if toolCall.result && toolCall.status === 'success'}
        <div class="px-4 py-3 border-b border-neutral-700">
          <div class="text-xs font-semibold text-neutral-400 mb-2">Result</div>
          <pre class="text-xs overflow-x-auto text-neutral-300 bg-neutral-900 p-2 rounded"><code>{formatJson(toolCall.result).substring(0, 500)}{formatJson(toolCall.result).length > 500 ? '...' : ''}</code></pre>
        </div>
      {/if}

      <!-- Error Section -->
      {#if toolCall.error && toolCall.status === 'error'}
        <div class="px-4 py-3">
          <div class="text-xs font-semibold text-red-400 mb-2">Error</div>
          <div class="text-xs text-red-300 bg-neutral-900 p-2 rounded font-mono">
            {toolCall.error}
          </div>
        </div>
      {/if}

      <!-- Timestamp -->
      <div class="px-4 py-2 text-xs text-neutral-500">
        {new Date(toolCall.timestamp).toLocaleTimeString()}
      </div>
    </div>
  {/if}
</div>


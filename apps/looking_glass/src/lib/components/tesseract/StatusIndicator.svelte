<script lang="ts">
  export let status: 'idle' | 'running' | 'done' | 'error' | 'not_initialized' = 'idle';
  export let device: string | null = null;
  export let percent: number = 0;

  const statusColors = {
    idle: 'bg-gray-500',
    running: 'bg-blue-500',
    done: 'bg-green-500',
    error: 'bg-red-500',
    not_initialized: 'bg-yellow-500'
  };

  const statusLabels = {
    idle: 'Idle',
    running: 'Running',
    done: 'Complete',
    error: 'Error',
    not_initialized: 'Not Initialized'
  };
</script>

<div class="flex items-center gap-2 group relative">
  <div class="relative">
    <div class={`w-2 h-2 rounded-full ${statusColors[status]}`}></div>
    {#if status === 'running'}
      <div class={`absolute inset-0 w-2 h-2 rounded-full ${statusColors[status]} animate-ping opacity-75`}></div>
    {/if}
  </div>
  
  <span class="text-xs text-neutral-400">
    {statusLabels[status]}
    {#if status === 'running' && device}
      <span class="text-neutral-500">({device})</span>
    {/if}
  </span>

  <!-- Tooltip -->
  <div class="absolute left-0 top-full mt-2 hidden group-hover:block z-50 w-48">
    <div class="bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-xs shadow-lg">
      <div class="font-semibold text-neutral-200 mb-2">Status Details</div>
      <div class="space-y-1 text-neutral-400">
        <div>State: <span class="text-neutral-200">{statusLabels[status]}</span></div>
        {#if device}
          <div>Device: <span class="text-neutral-200">{device}</span></div>
        {/if}
        {#if status === 'running'}
          <div>Progress: <span class="text-neutral-200">{percent.toFixed(1)}%</span></div>
        {/if}
      </div>
    </div>
  </div>
</div>


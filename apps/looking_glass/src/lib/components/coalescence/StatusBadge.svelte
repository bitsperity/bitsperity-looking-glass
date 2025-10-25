<script lang="ts">
  export let status: 'success' | 'error' | 'running' | 'pending' = 'pending';

  const statusConfig = {
    success: { bg: 'bg-green-900', text: 'text-green-400', label: '✅ Success' },
    error: { bg: 'bg-red-900', text: 'text-red-400', label: '❌ Error' },
    running: { bg: 'bg-blue-900', text: 'text-blue-400', label: '⚙️ Running' },
    pending: { bg: 'bg-yellow-900', text: 'text-yellow-400', label: '⏳ Pending' }
  };

  $: config = statusConfig[status];
</script>

<span class={`px-2 py-1 rounded text-xs font-semibold ${config.bg} ${config.text}`}>
  {config.label}
</span>


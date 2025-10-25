<script lang="ts">
  export let status: 'success' | 'error' | 'running' | 'pending' = 'pending';

  const statusConfig = {
    success: { 
      bg: 'bg-green-500/20', 
      text: 'text-green-400', 
      border: 'border-green-500/30',
      dot: 'bg-green-400',
      label: 'Success',
      icon: '✅'
    },
    error: { 
      bg: 'bg-red-500/20', 
      text: 'text-red-400', 
      border: 'border-red-500/30',
      dot: 'bg-red-400',
      label: 'Error',
      icon: '❌'
    },
    running: { 
      bg: 'bg-blue-500/20', 
      text: 'text-blue-400', 
      border: 'border-blue-500/30',
      dot: 'bg-blue-400',
      label: 'Running',
      icon: '⚙️'
    },
    pending: { 
      bg: 'bg-amber-500/20', 
      text: 'text-amber-400', 
      border: 'border-amber-500/30',
      dot: 'bg-amber-400',
      label: 'Pending',
      icon: '⏳'
    }
  };

  $: config = statusConfig[status];
</script>

<span class={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
  <span class={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'running' ? 'animate-pulse' : ''}`}></span>
  <span class={status === 'running' ? 'animate-pulse' : ''}>{config.icon}</span>
  <span>{config.label}</span>
</span>


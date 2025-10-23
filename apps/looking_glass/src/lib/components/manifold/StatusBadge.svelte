<script lang="ts">
  export let status: string;
  
  const colorMap: Record<string, string> = {
    active: 'bg-green-900 text-green-200',
    validated: 'bg-blue-900 text-blue-200',
    invalidated: 'bg-red-900 text-red-200',
    archived: 'bg-neutral-800 text-neutral-400',
    deleted: 'bg-neutral-800 text-neutral-500',
    quarantined: 'bg-yellow-900 text-yellow-200'
  };
  
  $: colorClass = colorMap[status] || 'bg-neutral-800 text-neutral-200';
</script>

<span class="text-xs px-2 py-0.5 rounded {colorClass}">
  {status}
</span>


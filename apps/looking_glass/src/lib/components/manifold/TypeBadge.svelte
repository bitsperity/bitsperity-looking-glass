<script lang="ts">
  export let type: string;
  
  const colorMap: Record<string, string> = {
    observation: 'bg-blue-900 text-blue-200',
    hypothesis: 'bg-purple-900 text-purple-200',
    analysis: 'bg-green-900 text-green-200',
    decision: 'bg-orange-900 text-orange-200',
    reflection: 'bg-pink-900 text-pink-200',
    question: 'bg-yellow-900 text-yellow-200'
  };
  
  $: colorClass = colorMap[type] || 'bg-neutral-800 text-neutral-200';
</script>

<span class="text-xs px-2 py-0.5 rounded {colorClass}">
  {type}
</span>


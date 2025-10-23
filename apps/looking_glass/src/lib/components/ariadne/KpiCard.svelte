<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let subtitle: string = '';
  export let trend: 'up' | 'down' | 'neutral' = 'neutral';
</script>

<div class="bg-neutral-900 rounded border border-neutral-800 p-4">
  <div class="text-sm text-neutral-400 mb-1">{title}</div>
  <div class="text-2xl font-semibold text-neutral-100 flex items-center gap-2">
    {value}
    {#if trend === 'up'}
      <span class="text-green-500 text-sm">↑</span>
    {:else if trend === 'down'}
      <span class="text-red-500 text-sm">↓</span>
    {/if}
  </div>
  {#if subtitle}
    <div class="text-xs text-neutral-500 mt-1">{subtitle}</div>
  {/if}
</div>


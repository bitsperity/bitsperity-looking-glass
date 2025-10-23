<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let subtitle: string = '';
  export let icon: string = '';
</script>

<div class="bg-neutral-900 rounded p-4 border border-neutral-800">
  <div class="flex items-center justify-between mb-2">
    <div class="text-sm text-neutral-400">{title}</div>
    {#if icon}
      <span class="text-xl">{icon}</span>
    {/if}
  </div>
  <div class="text-2xl font-semibold">{value}</div>
  {#if subtitle}
    <div class="text-xs text-neutral-500 mt-1">{subtitle}</div>
  {/if}
</div>


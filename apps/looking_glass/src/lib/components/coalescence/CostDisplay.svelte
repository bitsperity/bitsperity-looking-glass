<script lang="ts">
  export let cost: number = 0;
  export let currency: string = 'USD';
  export let showDetail: boolean = false;

  $: colorClass = cost < 0.1 ? 'text-green-400' : cost < 1 ? 'text-yellow-400' : 'text-red-400';
  $: formattedCost = `$${cost.toFixed(4)}`;
</script>

<div class={`inline-flex items-center gap-1 ${colorClass} font-semibold`}>
  {formattedCost}
  {#if showDetail}
    <span class="text-xs text-neutral-400">{currency}</span>
  {/if}
</div>


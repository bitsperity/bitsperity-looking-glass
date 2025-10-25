<script lang="ts">
  export let tokens: { input?: number; output?: number; total?: number } | number = 0;

  $: isObject = typeof tokens === 'object';
  $: total = isObject ? (tokens as any).total || 0 : (tokens as number);
  $: input = isObject ? (tokens as any).input || 0 : 0;
  $: output = isObject ? (tokens as any).output || 0 : 0;

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };
</script>

<div class="inline-flex items-center gap-2">
  <span class="font-semibold">{formatNumber(total)}</span>
  {#if isObject && (input > 0 || output > 0)}
    <span class="text-xs text-neutral-400">
      ({formatNumber(input)} in / {formatNumber(output)} out)
    </span>
  {/if}
</div>


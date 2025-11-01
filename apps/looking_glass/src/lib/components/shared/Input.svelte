<script lang="ts">
  export let label: string | null = null;
  export let placeholder: string = '';
  export let value: string = '';
  export let type: 'text' | 'date' | 'number' | 'email' = 'text';
  export let min: number | string | undefined = undefined;
  export let max: number | string | undefined = undefined;
</script>

<div class="flex flex-col gap-1.5">
  {#if label}
    <label class="text-xs font-medium text-neutral-400 uppercase tracking-wide">{label}</label>
  {/if}
  {#if type === 'date'}
    <input
      type="date"
      {placeholder}
      bind:value
      class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
    />
  {:else if type === 'number'}
    <input
      type="number"
      {placeholder}
      bind:value
      {min}
      {max}
      class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
    />
  {:else}
    <input
      type="text"
      {placeholder}
      bind:value
      class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
    />
  {/if}
</div>


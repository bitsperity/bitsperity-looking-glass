<script lang="ts">
  export let title: string = '';
  export let gradient: string = '';
  export let loading: boolean = false;
  export let error: string | null = null;
  export let emptyMessage: string | null = null;
</script>

<div class="backdrop-blur-glass bg-coalescence-glass border border-coalescence-border rounded-xl p-6 shadow-glass transition-all hover:shadow-glow {gradient}">
  {#if title}
    <div class="text-sm font-semibold text-neutral-200 mb-4">{title}</div>
  {/if}

  {#if loading}
    <div class="space-y-3">
      <div class="h-4 bg-neutral-700/50 rounded animate-pulse"></div>
      <div class="h-4 bg-neutral-700/50 rounded animate-pulse w-5/6"></div>
      <div class="h-4 bg-neutral-700/50 rounded animate-pulse w-4/6"></div>
    </div>
  {:else if error}
    <div class="flex items-start gap-3 p-4 bg-red-950/30 border border-red-500/50 rounded-lg">
      <div class="text-2xl flex-shrink-0">❌</div>
      <div>
        <div class="text-sm font-semibold text-red-300">Error</div>
        <div class="text-xs text-red-200 mt-1">{error}</div>
      </div>
    </div>
  {:else if emptyMessage}
    <div class="flex flex-col items-center justify-center py-8 text-center">
      <div class="text-4xl mb-3">📭</div>
      <div class="text-sm text-neutral-400">{emptyMessage}</div>
    </div>
  {:else}
    <slot />
  {/if}
</div>

<style>
  div {
    animation: fadeInSlide 0.3s ease-out;
  }

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

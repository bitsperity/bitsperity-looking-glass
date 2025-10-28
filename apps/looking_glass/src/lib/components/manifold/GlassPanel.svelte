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
      <div class="h-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-shimmer"></div>
      <div class="h-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-shimmer w-5/6"></div>
      <div class="h-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-shimmer w-4/6"></div>
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

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  :global(.animate-shimmer) {
    animation: shimmer 2s infinite;
    background-size: 200% 100%;
  }
</style>

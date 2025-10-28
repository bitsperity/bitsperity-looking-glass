<script lang="ts">
  import GlassPanel from './manifold/GlassPanel.svelte';

  let error: Error | null = null;

  function handleError(event: Event) {
    const errorEvent = event as any;
    error = errorEvent.detail;
  }

  function reset() {
    error = null;
  }
</script>

<svelte:window on:error={handleError} />

{#if error}
  <div class="p-6">
    <GlassPanel>
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="text-2xl flex-shrink-0">❌</div>
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-red-300 mb-1">Error occurred</h3>
            <p class="text-xs text-red-200/70 mb-3">{error.message}</p>
            <button
              on:click={reset}
              class="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </GlassPanel>
  </div>
{:else}
  <slot />
{/if}

<style>
</style>

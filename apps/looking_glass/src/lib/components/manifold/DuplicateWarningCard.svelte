<script lang="ts">
  export let warning: any;
  export let onLinkDuplicate: (id1: string, id2: string) => void = () => {};
  export let onDelete: (id: string) => void = () => {};

  let isProcessing = false;

  async function handleLink() {
    isProcessing = true;
    try {
      await onLinkDuplicate(warning.thought1?.id, warning.thought2?.id);
    } finally {
      isProcessing = false;
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this thought? This action cannot be undone.')) return;
    isProcessing = true;
    try {
      await onDelete(warning.thought2?.id);
    } finally {
      isProcessing = false;
    }
  }

  $: similarity = warning.similarity ? (warning.similarity * 100).toFixed(1) : '?';
</script>

<div class="bg-gradient-to-r from-amber-950/30 to-amber-900/20 border border-amber-500/50 rounded-lg p-4 hover:border-amber-400/70 transition-colors">
  <div class="flex items-start gap-3">
    <!-- Warning Icon -->
    <div class="text-amber-500 text-xl flex-shrink-0 mt-0.5">⚠️</div>
    
    <div class="flex-1 min-w-0">
      <!-- Title & Similarity -->
      <div class="mb-2">
        <div class="text-sm font-semibold text-amber-100 mb-1">
          Potential Duplicate
        </div>
        <div class="text-xs text-amber-300/80">
          <span class="font-mono">{similarity}%</span>
          <span class="text-amber-400/60 mx-1">similarity</span>
        </div>
      </div>

      <!-- Thoughts Comparison -->
      <div class="space-y-2 mb-3">
        <!-- Thought 1 -->
        {#if warning.thought1}
          <div class="bg-neutral-800/50 rounded px-3 py-2 border-l-2 border-indigo-500">
            <div class="text-xs font-medium text-neutral-200 truncate">
              {warning.thought1.title}
            </div>
            <div class="text-xs text-neutral-500">
              {warning.thought1.type}
            </div>
          </div>
        {/if}

        <!-- Arrow -->
        <div class="text-center">
          <span class="text-xs text-neutral-600">↔</span>
        </div>

        <!-- Thought 2 -->
        {#if warning.thought2}
          <div class="bg-neutral-800/50 rounded px-3 py-2 border-l-2 border-amber-500">
            <div class="text-xs font-medium text-neutral-200 truncate">
              {warning.thought2.title}
            </div>
            <div class="text-xs text-neutral-500">
              {warning.thought2.type}
            </div>
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button
          class="flex-1 px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-xs font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={handleLink}
          disabled={isProcessing}
        >
          {isProcessing ? '...' : 'Link as Duplicate'}
        </button>
        <button
          class="flex-1 px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-xs font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={handleDelete}
          disabled={isProcessing}
        >
          {isProcessing ? '...' : 'Delete Second'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  div {
    animation: fadeInSlide 0.3s ease-out;
  }

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>

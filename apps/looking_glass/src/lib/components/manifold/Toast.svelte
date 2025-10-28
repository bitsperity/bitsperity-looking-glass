<script lang="ts">
  import { onMount } from 'svelte';

  export let message: string = '';
  export let type: 'success' | 'error' | 'info' = 'info';
  export let duration: number = 3000;
  export let onDismiss: () => void = () => {};

  let visible = false;
  let timeout: NodeJS.Timeout;

  onMount(() => {
    if (message) {
      visible = true;
      timeout = setTimeout(() => {
        visible = false;
        onDismiss();
      }, duration);
    }

    return () => clearTimeout(timeout);
  });

  function dismiss() {
    visible = false;
    clearTimeout(timeout);
    onDismiss();
  }
</script>

{#if visible}
  <div
    class="fixed bottom-6 right-6 z-50 animate-slideIn"
    in:transition={{ duration: 300 }}
    out:transition={{ duration: 200 }}
  >
    <div
      class={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-md
        border-l-4 transition-all
        ${type === 'success' ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100' : ''}
        ${type === 'error' ? 'bg-red-950/80 border-red-500 text-red-100' : ''}
        ${type === 'info' ? 'bg-indigo-950/80 border-indigo-500 text-indigo-100' : ''}
      `}
    >
      <div class="text-lg">
        {#if type === 'success'}
          ✓
        {:else if type === 'error'}
          ✕
        {:else}
          ℹ
        {/if}
      </div>
      <div class="flex-1">
        <p class="text-sm font-medium">{message}</p>
      </div>
      <button
        on:click={dismiss}
        class="text-opacity-70 hover:text-opacity-100 transition-all"
      >
        ✕
      </button>
    </div>
  </div>
{/if}

<style>
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(8px) translateX(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0) translateX(0);
    }
  }

  :global(.animate-slideIn) {
    animation: slideIn 0.3s ease-out;
  }
</style>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let shifted: boolean = false; // positions right: 21rem when true
  export let zoom: number = 1;

  const dispatch = createEventDispatcher<{ zoomIn: void; zoomOut: void; reset: void }>();
</script>

<div class="absolute top-4 transition-all duration-300 bg-gradient-to-br from-neutral-800/90 to-neutral-900/80 backdrop-blur-lg rounded-lg p-3 border border-neutral-700/50 shadow-xl {shifted ? 'right-[21rem]' : 'right-4'}">
  <div class="flex flex-col gap-2">
    <button
      on:click={() => dispatch('zoomIn')}
      class="w-8 h-8 flex items-center justify-center bg-neutral-700/50 hover:bg-neutral-600/50 rounded text-neutral-300 hover:text-white transition-colors"
      title="Zoom In"
    >
      +
    </button>
    <button
      on:click={() => dispatch('zoomOut')}
      class="w-8 h-8 flex items-center justify-center bg-neutral-700/50 hover:bg-neutral-600/50 rounded text-neutral-300 hover:text-white transition-colors"
      title="Zoom Out"
    >
      −
    </button>
    <button
      on:click={() => dispatch('reset')}
      class="w-8 h-8 flex items-center justify-center bg-neutral-700/50 hover:bg-neutral-600/50 rounded text-xs text-neutral-300 hover:text-white transition-colors"
      title="Reset View"
    >
      ⟲
    </button>
  </div>
  <div class="mt-2 pt-2 border-t border-neutral-700/50 text-xs text-neutral-400 text-center">
    {(zoom * 100).toFixed(0)}%
  </div>
</div>

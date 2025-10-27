<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();
  let canvas: HTMLCanvasElement;

  onMount(() => {
    dispatch('ready', { canvas });
  });

  function fwd(type: string, e: Event) {
    dispatch(type, e);
  }
</script>

<canvas
  bind:this={canvas}
  on:click={(e) => fwd('click', e)}
  on:contextmenu={(e) => { e.preventDefault(); fwd('contextmenu', e); }}
  on:mousedown={(e) => fwd('mousedown', e)}
  on:mouseup={(e) => fwd('mouseup', e)}
  on:mousemove={(e) => fwd('mousemove', e)}
  on:wheel={(e) => fwd('wheel', e)}
  class="rounded-xl border border-neutral-700/30 shadow-2xl bg-neutral-900/30 backdrop-blur-sm"
></canvas>

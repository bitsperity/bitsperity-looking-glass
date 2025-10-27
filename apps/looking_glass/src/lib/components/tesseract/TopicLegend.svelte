<script lang="ts">
  export let topics: string[] = [];
</script>

{#if topics.length > 0}
  <div class="absolute bottom-4 left-4 bg-gradient-to-br from-neutral-800/90 to-neutral-900/80 backdrop-blur-lg rounded-lg p-3 border border-neutral-700/50 shadow-xl max-w-xs">
    <p class="text-xs font-semibold text-neutral-300 mb-2">🏷️ Topics:</p>
    <div class="flex flex-wrap gap-2">
      {#each topics as topic}
        <span class="px-2 py-1 rounded border text-xs"
          style="border-color: rgba(59,130,246,0.3); color: rgb(147,197,253); background: rgba(59,130,246,0.2);">
          {topic}
        </span>
      {/each}
    </div>
  </div>
{/if}

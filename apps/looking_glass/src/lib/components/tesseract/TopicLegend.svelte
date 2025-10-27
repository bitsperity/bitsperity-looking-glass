<script lang="ts">
  import type { GraphNode } from '$lib/stores/tesseract';

  export let nodes: GraphNode[] = [];

  const TOPIC_COLORS = [
    'rgba(59, 130, 246, 1)',    // blue
    'rgba(16, 185, 129, 1)',    // green
    'rgba(245, 158, 11, 1)',    // amber
    'rgba(239, 68, 68, 1)',     // red
    'rgba(147, 51, 234, 1)',    // purple
    'rgba(236, 72, 153, 1)',    // pink
    'rgba(20, 184, 166, 1)',    // teal
    'rgba(251, 146, 60, 1)',    // orange
    'rgba(34, 197, 94, 1)',     // lime
    'rgba(168, 85, 247, 1)',    // violet
    'rgba(14, 165, 233, 1)',    // sky
    'rgba(244, 63, 94, 1)',     // rose
  ];

  function getTopicColor(topic: string): string {
    let hash = 0;
    for (let i = 0; i < topic.length; i++) {
      hash = ((hash << 5) - hash) + topic.charCodeAt(i);
      hash = hash & hash;
    }
    const index = Math.abs(hash) % TOPIC_COLORS.length;
    return TOPIC_COLORS[index];
  }

  $: uniqueTopics = [...new Set(nodes.flatMap(n => n.article.topics || []).filter(Boolean))].slice(0, 8);
</script>

{#if nodes.length > 0 && uniqueTopics.length > 0}
  <div class="absolute bottom-4 left-4 bg-gradient-to-br from-neutral-800/90 to-neutral-900/80 backdrop-blur-lg rounded-lg p-3 border border-neutral-700/50 shadow-xl max-w-xs">
    <p class="text-xs font-semibold text-neutral-300 mb-2">🏷️ Topics:</p>
    <div class="flex flex-wrap gap-2">
      {#each uniqueTopics as topic}
        <div class="flex items-center gap-1.5">
          <div
            class="w-3 h-3 rounded-full border-2"
            style="border-color: {getTopicColor(topic)}"
          ></div>
          <span class="text-xs text-neutral-400">{topic}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}


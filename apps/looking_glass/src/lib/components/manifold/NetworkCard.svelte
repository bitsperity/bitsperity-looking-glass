<script lang="ts">
  import { onMount } from 'svelte';

  export let thought: any;
  export let relations: any[] = [];

  let containerDiv: HTMLDivElement;
  let sigma: any = null;

  onMount(async () => {
    if (!containerDiv || !thought) return;

    // Dynamically import Sigma to avoid loading it globally
    const SigmaModule = await import('sigma');
    const Sigma = SigmaModule.default;

    // Build graph data
    const nodes = [
      {
        key: thought.id,
        label: thought.title,
        size: 20,
        color: '#6366f1', // indigo
        attributes: { type: 'center' }
      },
      ...relations.map((r: any, i: number) => ({
        key: `related-${i}`,
        label: r.title || `Related ${i + 1}`,
        size: 12,
        color: r.type === 'supports' ? '#10b981' : r.type === 'contradicts' ? '#ef4444' : '#3b82f6',
        attributes: { type: 'related', relationType: r.type }
      }))
    ];

    const edges = relations.map((r: any, i: number) => ({
      source: thought.id,
      target: `related-${i}`,
      attributes: { type: r.type, weight: r.weight || 0.8 }
    }));

    const graph = {
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e }))
    };

    try {
      sigma = new Sigma({
        container: containerDiv,
        graph: graph,
        settings: {
          labelDensity: 0.3,
          labelGridCellSize: 60,
          labelSize: 12,
          borderSize: 2,
          edgeColor: { default: '#666' },
          defaultNodeColor: '#999',
          defaultEdgeColor: '#666'
        }
      });

      // Auto-position nodes in a circle
      sigma.getCamera().animateTo({ x: 0, y: 0, angle: 0, ratio: 1 }, { duration: 500 });
    } catch (err) {
      console.error('Error initializing Sigma.js graph:', err);
    }
  });
</script>

<div class="space-y-3">
  <h3 class="font-semibold text-sm text-neutral-100">🔗 Related Thoughts Network</h3>

  <div
    bind:this={containerDiv}
    class="rounded border border-white/10 h-48 bg-slate-900/50 overflow-hidden"
  />

  <!-- Legend -->
  <div class="text-xs space-y-1 text-neutral-400">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full" style="background-color: #10b981" />
      <span>Supports</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full" style="background-color: #ef4444" />
      <span>Contradicts</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full" style="background-color: #3b82f6" />
      <span>Related</span>
    </div>
  </div>

  {#if relations.length === 0}
    <div class="text-xs text-neutral-500 italic py-4 text-center">
      No related thoughts yet
    </div>
  {/if}
</div>

<style>
</style>

<script lang="ts">
  export let zoom: number = 1;
  export let similarityThreshold: number = 0.7;
  export let hasHoveredOrPinned: boolean = false;
  export let onZoomIn: () => void = () => {};
  export let onZoomOut: () => void = () => {};
  export let onResetView: () => void = () => {};
  export let onThresholdChange: (value: number) => void = () => {};
</script>

<!-- Pan & Zoom Controls (move left when hover panel or pinned sidebar is visible) -->
<div class="absolute top-4 transition-all duration-300 bg-gradient-to-br from-neutral-800/90 to-neutral-900/80 backdrop-blur-lg rounded-lg p-3 border border-neutral-700/50 shadow-xl {hasHoveredOrPinned ? 'right-[21rem]' : 'right-4'}">
  <div class="flex flex-col gap-2">
    <button
      on:click={onZoomIn}
      class="w-8 h-8 flex items-center justify-center bg-neutral-700/50 hover:bg-neutral-600/50 rounded text-neutral-300 hover:text-white transition-colors"
      title="Zoom In"
    >
      +
    </button>
    <button
      on:click={onZoomOut}
      class="w-8 h-8 flex items-center justify-center bg-neutral-700/50 hover:bg-neutral-600/50 rounded text-neutral-300 hover:text-white transition-colors"
      title="Zoom Out"
    >
      −
    </button>
    <button
      on:click={onResetView}
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

<!-- Similarity Threshold Slider -->
<div class="absolute bottom-4 left-4 bg-gradient-to-br from-neutral-800/90 to-neutral-900/80 backdrop-blur-lg rounded-lg p-4 border border-neutral-700/50 shadow-xl w-64">
  <div class="flex items-center justify-between mb-2">
    <label for="threshold" class="text-xs font-semibold text-neutral-300">Similarity Threshold</label>
    <span class="text-xs text-neutral-400 font-mono">{(similarityThreshold * 100).toFixed(0)}%</span>
  </div>
  <input
    id="threshold"
    type="range"
    min="0"
    max="1"
    step="0.01"
    value={similarityThreshold}
    on:input={(e) => onThresholdChange(parseFloat(e.currentTarget.value))}
    class="w-full h-2 bg-neutral-700/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
  />
  
  <!-- Controls Help -->
  <div class="mt-3 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/5 border border-blue-500/20 rounded-lg">
    <p class="text-xs text-neutral-300 font-semibold mb-2">🎮 Controls:</p>
    <div class="grid grid-cols-2 gap-2 text-xs text-neutral-400">
      <div><span class="text-blue-300">Mouse Wheel:</span> Zoom</div>
      <div><span class="text-blue-300">Alt+Drag:</span> Pan</div>
      <div><span class="text-blue-300">Click Node:</span> Expand</div>
      <div><span class="text-blue-300">Shift+Click:</span> Pin Details</div>
    </div>
  </div>
</div>


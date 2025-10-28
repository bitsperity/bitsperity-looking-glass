<script lang="ts">
  export let vectorType: 'summary' | 'text' | 'title' = 'summary';
  export let cheapMode: boolean = false;
  export let sessionId: string = '';
  export let workspaceId: string = '';
  
  export let onVectorTypeChange: (type: string) => void = () => {};
  export let onCheapModeChange: (mode: boolean) => void = () => {};
  export let onSessionChange: (id: string) => void = () => {};
  export let onWorkspaceChange: (id: string) => void = () => {};
</script>

<div class="bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-lg p-4 border border-neutral-700 space-y-3">
  <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
    <!-- Vector Type Selector -->
    <div>
      <label class="text-xs text-neutral-400 mb-1 block font-medium">Vector Type</label>
      <select 
        class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 hover:border-indigo-500 transition-colors focus:outline-none focus:border-indigo-500"
        bind:value={vectorType} 
        on:change={() => onVectorTypeChange(vectorType)}
      >
        <option value="summary">Summary (fast)</option>
        <option value="text">Text (full)</option>
        <option value="title">Title (short)</option>
      </select>
    </div>
    
    <!-- Cheap Mode Toggle -->
    <div>
      <label class="text-xs text-neutral-400 mb-1 block font-medium">Retrieval Mode</label>
      <label class="flex items-center gap-2 px-3 py-2 rounded bg-neutral-800 border border-neutral-700 hover:border-indigo-500 transition-colors cursor-pointer h-full">
        <input 
          type="checkbox" 
          bind:checked={cheapMode} 
          on:change={() => onCheapModeChange(cheapMode)}
          class="rounded"
        />
        <span class="text-sm text-neutral-200">Cheap Mode</span>
      </label>
    </div>
    
    <!-- Session Filter -->
    <div>
      <label class="text-xs text-neutral-400 mb-1 block font-medium">Session</label>
      <input 
        class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 hover:border-indigo-500 transition-colors focus:outline-none focus:border-indigo-500"
        placeholder="All" 
        bind:value={sessionId} 
        on:change={() => onSessionChange(sessionId)}
      />
    </div>

    <!-- Workspace Filter -->
    <div>
      <label class="text-xs text-neutral-400 mb-1 block font-medium">Workspace</label>
      <input 
        class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 hover:border-indigo-500 transition-colors focus:outline-none focus:border-indigo-500"
        placeholder="All" 
        bind:value={workspaceId} 
        on:change={() => onWorkspaceChange(workspaceId)}
      />
    </div>
  </div>

  {#if cheapMode}
    <div class="text-xs text-indigo-400 bg-indigo-950/30 rounded px-3 py-2 border border-indigo-500/20">
      💡 Cheap mode retrieves summaries only (faster, ~50 tokens/result vs 500)
    </div>
  {/if}
</div>

<style>
  :global(select:focus-visible) {
    outline: none;
  }
</style>

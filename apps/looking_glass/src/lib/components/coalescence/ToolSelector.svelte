<script lang="ts">
  import { onMount } from 'svelte';
  import { coalescenceClient } from '$lib/coalescence-client';

  export let selectedTools: string[] = [];
  export let onToolsChange: (tools: string[]) => void = () => {};

  let toolsByMcp: Record<string, any[]> = {};
  let loading = true;
  let error: string | null = null;
  let searchQuery = '';
  let expandedMcps: Set<string> = new Set(['satbase', 'tesseract', 'manifold', 'ariadne']); // Default: expand main MCPs

  const mcpLabels: Record<string, string> = {
    'satbase': '📊 Satbase',
    'tesseract': '🔍 Tesseract',
    'manifold': '🧠 Manifold',
    'ariadne': '🕸️ Ariadne',
    'coalescence': '⚙️ Coalescence',
    'telegram': '📱 Telegram'
  };

  async function loadTools() {
    try {
      loading = true;
      error = null;
      
      const result = await coalescenceClient.listAllTools();
      toolsByMcp = result.byMcp || {};
      
      // Default expand main MCPs if we have tools
      if (Object.keys(toolsByMcp).length > 0 && expandedMcps.size === 0) {
        expandedMcps = new Set(Object.keys(toolsByMcp).slice(0, 4));
      }
    } catch (e: any) {
      error = `Failed to load tools: ${e.message}`;
      console.error('Error loading tools:', e);
    } finally {
      loading = false;
    }
  }

  function toggleMcp(mcpName: string) {
    if (expandedMcps.has(mcpName)) {
      expandedMcps.delete(mcpName);
    } else {
      expandedMcps.add(mcpName);
    }
    expandedMcps = expandedMcps;
  }

  function toggleTool(toolPrefixedName: string) {
    if (selectedTools.includes(toolPrefixedName)) {
      selectedTools = selectedTools.filter(t => t !== toolPrefixedName);
    } else {
      selectedTools = [...selectedTools, toolPrefixedName];
    }
    onToolsChange(selectedTools);
  }

  function selectAllInMcp(mcpName: string) {
    const mcpTools = toolsByMcp[mcpName] || [];
    const mcpToolNames = mcpTools.map((t: any) => t.name || t.prefixedName);
    const newSelected = [...selectedTools];
    
    mcpToolNames.forEach((toolName: string) => {
      if (!newSelected.includes(toolName)) {
        newSelected.push(toolName);
      }
    });
    
    selectedTools = newSelected;
    onToolsChange(selectedTools);
  }

  function deselectAllInMcp(mcpName: string) {
    const mcpTools = toolsByMcp[mcpName] || [];
    const mcpToolNames = mcpTools.map((t: any) => t.name || t.prefixedName);
    selectedTools = selectedTools.filter(t => !mcpToolNames.includes(t));
    onToolsChange(selectedTools);
  }

  function clearAll() {
    selectedTools = [];
    onToolsChange(selectedTools);
  }

  function getFilteredTools(mcpTools: any[]): any[] {
    if (!searchQuery) return mcpTools;
    const query = searchQuery.toLowerCase();
    return mcpTools.filter((tool: any) => {
      const name = (tool.name || tool.prefixedName || tool.toolName || '').toLowerCase();
      const desc = (tool.description || '').toLowerCase();
      return name.includes(query) || desc.includes(query);
    });
  }

  function getSelectedCountInMcp(mcpName: string): number {
    const mcpTools = toolsByMcp[mcpName] || [];
    const mcpToolNames = mcpTools.map((t: any) => t.name || t.prefixedName || t.toolName);
    return mcpToolNames.filter((name: string) => selectedTools.includes(name)).length;
  }

  $: totalSelected = selectedTools.length;
  $: totalAvailable = Object.values(toolsByMcp).reduce((sum, tools) => sum + tools.length, 0);

  onMount(() => {
    loadTools();
  });
</script>

<div class="tool-selector">
  <!-- Header with Search and Stats -->
  <div class="tool-selector-header">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-bold text-white mb-1">🔧 Tool-Auswahl</h3>
        <p class="text-xs text-neutral-400">
          {totalSelected} von {totalAvailable} Tools ausgewählt
        </p>
      </div>
      {#if totalSelected > 0}
        <button
          on:click={clearAll}
          class="px-3 py-1.5 text-xs font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded-lg transition-colors"
        >
          Alle abwählen
        </button>
      {/if}
    </div>

    <!-- Search -->
    <div class="relative mb-4">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Tool suchen... (Name oder Beschreibung)"
        class="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      {#if searchQuery}
        <button
          on:click={() => searchQuery = ''}
          class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
        >
          ✕
        </button>
      {/if}
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block animate-spin text-3xl mb-3">⚙️</div>
        <div class="text-sm text-neutral-400">Tools werden geladen...</div>
      </div>
    </div>
  {:else if error}
    <div class="bg-gradient-to-r from-red-900/40 to-red-800/30 border-2 border-red-600/50 rounded-xl p-4 mb-4 text-red-300 text-sm">
      <span class="text-lg mr-2">⚠️</span>
      {error}
    </div>
  {:else}
    <!-- MCP Groups -->
    <div class="tool-selector-content">
      {#each Object.entries(toolsByMcp) as [mcpName, mcpTools]}
        {@const filteredTools = getFilteredTools(mcpTools)}
        {@const selectedCount = getSelectedCountInMcp(mcpName)}
        {@const totalInMcp = mcpTools.length}
        {@const isExpanded = expandedMcps.has(mcpName)}
        {@const allSelected = selectedCount === totalInMcp && totalInMcp > 0}
        
        {#if filteredTools.length > 0 || !searchQuery}
          <div class="mcp-group">
            <!-- MCP Header -->
            <button
              on:click={() => toggleMcp(mcpName)}
              class="mcp-group-header"
            >
              <div class="flex items-center gap-3 flex-1">
                <span class="text-lg transition-transform {isExpanded ? 'rotate-90' : ''}">▶</span>
                <span class="font-semibold text-white">
                  {mcpLabels[mcpName] || mcpName}
                </span>
                <span class="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded-full">
                  {totalInMcp} Tools
                </span>
                {#if selectedCount > 0}
                  <span class="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                    {selectedCount} ausgewählt
                  </span>
                {/if}
              </div>
              
              {#if isExpanded && totalInMcp > 0}
                <div class="flex items-center gap-2" on:click|stopPropagation>
                  {#if !allSelected}
                    <button
                      on:click={() => selectAllInMcp(mcpName)}
                      class="px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/50 rounded transition-colors"
                    >
                      Alle auswählen
                    </button>
                  {/if}
                  {#if selectedCount > 0}
                    <button
                      on:click={() => deselectAllInMcp(mcpName)}
                      class="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded transition-colors"
                    >
                      Alle abwählen
                    </button>
                  {/if}
                </div>
              {/if}
            </button>

            <!-- Tools List (expanded) -->
            {#if isExpanded}
              <div class="mcp-tools-list">
                {#each filteredTools as tool}
                  {@const toolName = tool.name || tool.prefixedName || tool.toolName}
                  {@const isSelected = selectedTools.includes(toolName)}
                  {@const displayName = tool.toolName || toolName.replace(`${tool.mcpName || mcpName}_`, '')}
                  
                  <label
                    class="tool-item {isSelected ? 'selected' : ''}"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      on:change={() => toggleTool(toolName)}
                      class="tool-checkbox"
                    />
                    <div class="tool-content">
                      <div class="tool-name-row">
                        <span class="tool-name">{displayName}</span>
                        {#if isSelected}
                          <span class="text-xs text-blue-400">✓</span>
                        {/if}
                      </div>
                      {#if tool.description}
                        <p class="tool-description">{tool.description}</p>
                      {/if}
                    </div>
                  </label>
                {/each}
                
                {#if filteredTools.length === 0 && searchQuery}
                  <div class="text-center py-4 text-sm text-neutral-500">
                    Keine Tools gefunden für "{searchQuery}"
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
      
      {#if Object.keys(toolsByMcp).length === 0 && !loading}
        <div class="text-center py-8 text-neutral-500 text-sm">
          Keine Tools verfügbar. Stelle sicher, dass der Orchestrator läuft.
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tool-selector {
    @apply bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700 rounded-xl p-4;
  }

  .tool-selector-header {
    @apply mb-4;
  }

  .tool-selector-content {
    @apply space-y-2 max-h-96 overflow-y-auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
  }

  .tool-selector-content::-webkit-scrollbar {
    width: 6px;
  }

  .tool-selector-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .tool-selector-content::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.3);
    border-radius: 3px;
  }

  .tool-selector-content::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.5);
  }

  .mcp-group {
    @apply bg-neutral-900/50 border border-neutral-700 rounded-lg overflow-hidden;
  }

  .mcp-group-header {
    @apply w-full px-4 py-3 flex items-center justify-between bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors cursor-pointer;
  }

  .mcp-tools-list {
    @apply px-4 py-2 space-y-1 max-h-64 overflow-y-auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(59, 130, 246, 0.2) transparent;
  }

  .tool-item {
    @apply flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border border-transparent;
    @apply hover:bg-neutral-800/30 hover:border-neutral-700;
  }

  .tool-item.selected {
    @apply bg-blue-600/20 border-blue-600/50;
  }

  .tool-checkbox {
    @apply mt-1 w-4 h-4 cursor-pointer accent-blue-500;
  }

  .tool-content {
    @apply flex-1 min-w-0;
  }

  .tool-name-row {
    @apply flex items-center justify-between gap-2 mb-1;
  }

  .tool-name {
    @apply text-sm font-medium text-white;
  }

  .tool-description {
    @apply text-xs text-neutral-400 line-clamp-2;
  }
</style>


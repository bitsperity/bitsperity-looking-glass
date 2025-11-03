<script lang="ts">
  import { onMount } from 'svelte';
  import { coalescenceClient } from '$lib/coalescence-client';

  export let selectedTools: string[] = [];
  export let onToolsChange: (tools: string[]) => void = () => {};

  // Internal state that syncs with prop
  let internalSelectedTools: string[] = [];
  
  let toolsByMcp: Record<string, any[]> = {};
  let loading = true;
  let error: string | null = null;
  let searchQuery = '';
  let selectedMcps: Set<string> = new Set();
  let viewMode: 'grid' | 'list' = 'grid';
  let expandedMcps: Set<string> = new Set();
  let hoveredTool: string | null = null;
  let showToolDetails: string | null = null;

  // Sync internal state with prop when it changes (e.g., when turn changes)
  // Use a reactive statement that always syncs when the prop reference changes
  $: {
    internalSelectedTools = [...(selectedTools || [])];
  }
  
  // Initialize on mount
  onMount(() => {
    loadTools();
  });

  const mcpLabels: Record<string, string> = {
    'satbase': '📊 Satbase',
    'tesseract': '🔍 Tesseract',
    'manifold': '🧠 Manifold',
    'ariadne': '🕸️ Ariadne',
    'coalescence': '⚙️ Coalescence',
    'telegram': '📱 Telegram',
    'exploration': '🗺️ Exploration'
  };

  const mcpColors: Record<string, string> = {
    'satbase': 'blue',
    'tesseract': 'purple',
    'manifold': 'indigo',
    'ariadne': 'green',
    'coalescence': 'amber',
    'telegram': 'cyan',
    'exploration': 'pink'
  };

  async function loadTools() {
    try {
      loading = true;
      error = null;
      
      const result = await coalescenceClient.listAllTools();
      toolsByMcp = result.byMcp || {};
      
      // Initialize: select all MCPs and expand main ones
      selectedMcps = new Set(Object.keys(toolsByMcp));
      expandedMcps = new Set(['satbase', 'tesseract', 'manifold', 'ariadne']);
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

  function toggleMcpFilter(mcpName: string) {
    if (selectedMcps.has(mcpName)) {
      selectedMcps.delete(mcpName);
    } else {
      selectedMcps.add(mcpName);
    }
    selectedMcps = selectedMcps;
  }

  function toggleTool(toolPrefixedName: string) {
    if (internalSelectedTools.includes(toolPrefixedName)) {
      internalSelectedTools = internalSelectedTools.filter(t => t !== toolPrefixedName);
    } else {
      internalSelectedTools = [...internalSelectedTools, toolPrefixedName];
    }
    onToolsChange(internalSelectedTools);
  }

  function selectAllInMcp(mcpName: string) {
    const mcpTools = toolsByMcp[mcpName] || [];
    const mcpToolNames = mcpTools.map((t: any) => t.name || t.prefixedName);
    const newSelected = [...internalSelectedTools];
    
    mcpToolNames.forEach((toolName: string) => {
      if (!newSelected.includes(toolName)) {
        newSelected.push(toolName);
      }
    });
    
    internalSelectedTools = newSelected;
    onToolsChange(internalSelectedTools);
  }

  function deselectAllInMcp(mcpName: string) {
    const mcpTools = toolsByMcp[mcpName] || [];
    const mcpToolNames = mcpTools.map((t: any) => t.name || t.prefixedName || t.toolName);
    internalSelectedTools = internalSelectedTools.filter(t => !mcpToolNames.includes(t));
    onToolsChange(internalSelectedTools);
  }

  function clearAll() {
    internalSelectedTools = [];
    onToolsChange(internalSelectedTools);
  }

  function selectAllVisible() {
    const visibleTools: string[] = [];
    Object.entries(toolsByMcp).forEach(([mcpName, mcpTools]) => {
      if (selectedMcps.has(mcpName)) {
        const filtered = getFilteredTools(mcpTools);
        filtered.forEach(tool => {
          const toolName = tool.name || tool.prefixedName || tool.toolName;
          if (!visibleTools.includes(toolName)) {
            visibleTools.push(toolName);
          }
        });
      }
    });
    internalSelectedTools = [...new Set([...internalSelectedTools, ...visibleTools])];
    onToolsChange(internalSelectedTools);
  }

  function getFilteredTools(mcpTools: any[]): any[] {
    if (!searchQuery) return mcpTools;
    const query = searchQuery.toLowerCase();
    return mcpTools.filter((tool: any) => {
      const name = (tool.name || tool.prefixedName || tool.toolName || '').toLowerCase();
      const desc = (tool.description || '').toLowerCase();
      const toolName = (tool.toolName || '').toLowerCase();
      
      // Also search in inputSchema properties
      let schemaMatch = false;
      if (tool.inputSchema?.properties) {
        const props = Object.keys(tool.inputSchema.properties);
        schemaMatch = props.some((prop: string) => prop.toLowerCase().includes(query));
      }
      
      return name.includes(query) || desc.includes(query) || toolName.includes(query) || schemaMatch;
    });
  }

  function getSelectedCountInMcp(mcpName: string): number {
    const mcpTools = toolsByMcp[mcpName] || [];
    const mcpToolNames = mcpTools.map((t: any) => t.name || t.prefixedName || t.toolName);
    return mcpToolNames.filter((name: string) => internalSelectedTools.includes(name)).length;
  }

  function getRequiredParams(tool: any): string[] {
    if (!tool.inputSchema?.required) return [];
    return tool.inputSchema.required;
  }

  function getOptionalParams(tool: any): string[] {
    if (!tool.inputSchema?.properties) return [];
    const allProps = Object.keys(tool.inputSchema.properties);
    const required = tool.inputSchema.required || [];
    return allProps.filter(p => !required.includes(p));
  }

  $: totalSelected = internalSelectedTools.length;
  $: totalAvailable = Object.values(toolsByMcp).reduce((sum, tools) => sum + tools.length, 0);
  $: visibleMcps = Object.keys(toolsByMcp).filter(mcp => selectedMcps.has(mcp));
  
  // Reactive: Force re-computation when searchQuery or toolsByMcp changes
  // Create a computed filtered tools cache per MCP
  $: filteredToolsCache = searchQuery ? (() => {
    const cache: Record<string, any[]> = {};
    Object.keys(toolsByMcp).forEach(mcpName => {
      cache[mcpName] = getFilteredTools(toolsByMcp[mcpName] || []);
    });
    return cache;
  })() : {};
</script>

<div class="tool-selector-modern">
  <!-- Header -->
  <div class="tool-header">
    <div class="header-top">
      <div>
        <h3 class="header-title">🔧 Tool-Auswahl</h3>
        <p class="header-subtitle">
          {totalSelected} von {totalAvailable} Tools ausgewählt
        </p>
      </div>
      <div class="header-actions">
        {#if totalSelected > 0}
          <button
            on:click={clearAll}
            class="btn-clear"
          >
            Alle abwählen
          </button>
        {/if}
        <button
          on:click={() => viewMode = viewMode === 'grid' ? 'list' : 'grid'}
          class="btn-view-toggle"
          title={viewMode === 'grid' ? 'Liste anzeigen' : 'Grid anzeigen'}
        >
          {viewMode === 'grid' ? '☰' : '⊞'}
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-container">
      <div class="search-icon">🔍</div>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Tool suchen... (Name, Beschreibung oder Parameter)"
        class="search-input"
      />
      {#if searchQuery}
        <button
          on:click={() => searchQuery = ''}
          class="search-clear"
        >
          ✕
        </button>
      {/if}
    </div>

    <!-- MCP Quick Filters -->
    <div class="mcp-filters">
      {#each Object.keys(toolsByMcp) as mcpName}
        {@const toolCount = toolsByMcp[mcpName]?.length || 0}
        {@const selectedCount = getSelectedCountInMcp(mcpName)}
        {@const isSelected = selectedMcps.has(mcpName)}
        {@const color = mcpColors[mcpName] || 'gray'}
        <button
          on:click={() => toggleMcpFilter(mcpName)}
          class="mcp-filter-btn {isSelected ? 'active' : ''} color-{color}"
          title="{mcpLabels[mcpName] || mcpName}: {toolCount} Tools"
        >
          <span class="mcp-filter-icon">{mcpLabels[mcpName]?.split(' ')[0] || '📦'}</span>
          <span class="mcp-filter-label">{mcpLabels[mcpName]?.split(' ')[1] || mcpName}</span>
          <span class="mcp-filter-count">{toolCount}</span>
          {#if selectedCount > 0}
            <span class="mcp-filter-selected">{selectedCount}</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-state">
      <div class="spinner">⚙️</div>
      <div class="loading-text">Tools werden geladen...</div>
    </div>
  {:else if error}
    <div class="error-state">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{error}</span>
    </div>
  {:else}
    <!-- Tools Content -->
    <div class="tools-content">
      {#each visibleMcps as mcpName}
        {@const mcpTools = toolsByMcp[mcpName] || []}
        {@const filteredTools = searchQuery ? (filteredToolsCache[mcpName] || []) : mcpTools}
        {@const selectedCount = getSelectedCountInMcp(mcpName)}
        {@const totalInMcp = mcpTools.length}
        {@const isExpanded = expandedMcps.has(mcpName)}
        {@const allSelected = selectedCount === totalInMcp && totalInMcp > 0}
        {@const color = mcpColors[mcpName] || 'gray'}
        
        {#if filteredTools.length > 0 || !searchQuery}
          <div class="mcp-section">
            <!-- MCP Section Header -->
            <div class="mcp-section-header">
              <button
                on:click={() => toggleMcp(mcpName)}
                class="mcp-section-toggle"
              >
                <span class="toggle-icon {isExpanded ? 'expanded' : ''}">▶</span>
                <span class="mcp-section-icon">{mcpLabels[mcpName]?.split(' ')[0] || '📦'}</span>
                <span class="mcp-section-name">{mcpLabels[mcpName]?.split(' ')[1] || mcpName}</span>
                <span class="mcp-section-count">{totalInMcp} Tools</span>
                {#if selectedCount > 0}
                  <span class="mcp-section-selected">{selectedCount} ausgewählt</span>
                {/if}
              </button>
              
              {#if isExpanded && totalInMcp > 0}
                <div class="mcp-section-actions" on:click|stopPropagation>
                  {#if !allSelected}
                    <button
                      on:click={() => selectAllInMcp(mcpName)}
                      class="btn-select-all"
                    >
                      Alle auswählen
                    </button>
                  {/if}
                  {#if selectedCount > 0}
                    <button
                      on:click={() => deselectAllInMcp(mcpName)}
                      class="btn-deselect-all"
                    >
                      Alle abwählen
                    </button>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Tools Grid/List -->
            {#if isExpanded}
              {#if viewMode === 'grid'}
                <div class="tools-grid">
                  {#each filteredTools as tool}
                    {@const toolName = tool.name || tool.prefixedName || tool.toolName}
                    {@const isSelected = internalSelectedTools.includes(toolName)}
                    {@const displayName = tool.toolName || toolName.replace(`${tool.mcpName || mcpName}_`, '')}
                    {@const requiredParams = getRequiredParams(tool)}
                    {@const optionalParams = getOptionalParams(tool)}
                    
                    <div
                      class="tool-card {isSelected ? 'selected' : ''} color-{color}"
                      on:mouseenter={() => hoveredTool = toolName}
                      on:mouseleave={() => hoveredTool = null}
                    >
                      <div class="tool-card-header">
                        <label class="tool-checkbox-label">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            on:change={() => toggleTool(toolName)}
                            class="tool-checkbox"
                          />
                          <span class="tool-name">{displayName}</span>
                        </label>
                        {#if isSelected}
                          <span class="tool-selected-badge">✓</span>
                        {/if}
                      </div>
                      
                      {#if tool.description}
                        <p class="tool-description">{tool.description}</p>
                      {/if}
                      
                      {#if requiredParams.length > 0 || optionalParams.length > 0}
                        <div class="tool-params">
                          {#if requiredParams.length > 0}
                            <div class="tool-params-group">
                              <span class="tool-params-label">Required:</span>
                              <div class="tool-params-tags">
                                {#each requiredParams.slice(0, 3) as param}
                                  <span class="tool-param-tag required">{param}</span>
                                {/each}
                                {#if requiredParams.length > 3}
                                  <span class="tool-param-tag more">+{requiredParams.length - 3}</span>
                                {/if}
                              </div>
                            </div>
                          {/if}
                          {#if optionalParams.length > 0}
                            <div class="tool-params-group">
                              <span class="tool-params-label">Optional:</span>
                              <span class="tool-params-count">{optionalParams.length}</span>
                            </div>
                          {/if}
                        </div>
                      {/if}
                      
                      <!-- Tool Details Tooltip -->
                      {#if hoveredTool === toolName}
                        <div class="tool-tooltip">
                          <div class="tooltip-header">
                            <span class="tooltip-name">{displayName}</span>
                            <span class="tooltip-mcp">{mcpName}</span>
                          </div>
                          {#if tool.description}
                            <p class="tooltip-description">{tool.description}</p>
                          {/if}
                          {#if requiredParams.length > 0}
                            <div class="tooltip-section">
                              <strong>Required Parameters:</strong>
                              <ul class="tooltip-list">
                                {#each requiredParams as param}
                                  <li>{param}</li>
                                {/each}
                              </ul>
                            </div>
                          {/if}
                          {#if optionalParams.length > 0}
                            <div class="tooltip-section">
                              <strong>Optional Parameters ({optionalParams.length}):</strong>
                              <div class="tooltip-params-grid">
                                {#each optionalParams.slice(0, 6) as param}
                                  <span class="tooltip-param">{param}</span>
                                {/each}
                                {#if optionalParams.length > 6}
                                  <span class="tooltip-param-more">+{optionalParams.length - 6} more</span>
                                {/if}
                              </div>
                            </div>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="tools-list">
                  {#each filteredTools as tool}
                    {@const toolName = tool.name || tool.prefixedName || tool.toolName}
                    {@const isSelected = internalSelectedTools.includes(toolName)}
                    {@const displayName = tool.toolName || toolName.replace(`${tool.mcpName || mcpName}_`, '')}
                    {@const requiredParams = getRequiredParams(tool)}
                    {@const optionalParams = getOptionalParams(tool)}
                    
                    <div
                      class="tool-list-item {isSelected ? 'selected' : ''}"
                      on:mouseenter={() => hoveredTool = toolName}
                      on:mouseleave={() => hoveredTool = null}
                    >
                      <label class="tool-list-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          on:change={() => toggleTool(toolName)}
                          class="tool-checkbox"
                        />
                        <div class="tool-list-content">
                          <div class="tool-list-header">
                            <span class="tool-list-name">{displayName}</span>
                            {#if isSelected}
                              <span class="tool-list-badge">✓ Ausgewählt</span>
                            {/if}
                          </div>
                          {#if tool.description}
                            <p class="tool-list-description">{tool.description}</p>
                          {/if}
                          {#if requiredParams.length > 0 || optionalParams.length > 0}
                            <div class="tool-list-params">
                              {#if requiredParams.length > 0}
                                <span class="tool-list-param-info">
                                  <strong>Required:</strong> {requiredParams.join(', ')}
                                </span>
                              {/if}
                              {#if optionalParams.length > 0}
                                <span class="tool-list-param-info">
                                  <strong>Optional:</strong> {optionalParams.length} Parameter
                                </span>
                              {/if}
                            </div>
                          {/if}
                        </div>
                      </label>
                    </div>
                  {/each}
                </div>
              {/if}
              
              {#if filteredTools.length === 0 && searchQuery}
                <div class="empty-filter">
                  Keine Tools gefunden für "{searchQuery}" in {mcpLabels[mcpName] || mcpName}
                </div>
              {/if}
            {/if}
          </div>
        {/if}
      {/each}
      
      {#if visibleMcps.length === 0}
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Keine MCPs aktiv</div>
          <p class="empty-description">Wähle mindestens eine MCP aus, um Tools anzuzeigen</p>
        </div>
      {:else if Object.values(toolsByMcp).reduce((sum, tools) => sum + (selectedMcps.has(tools[0]?.mcpName) ? tools.length : 0), 0) === 0 && !loading}
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <div class="empty-title">Keine Tools verfügbar</div>
          <p class="empty-description">Stelle sicher, dass der Orchestrator läuft</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tool-selector-modern {
    @apply bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700 rounded-xl p-6;
  }

  /* Header */
  .tool-header {
    @apply space-y-4 mb-6;
  }

  .header-top {
    @apply flex items-center justify-between;
  }

  .header-title {
    @apply text-xl font-bold text-white mb-1;
  }

  .header-subtitle {
    @apply text-sm text-neutral-400;
  }

  .header-actions {
    @apply flex items-center gap-2;
  }

  .btn-clear {
    @apply px-4 py-2 text-sm font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded-lg transition-colors;
  }

  .btn-view-toggle {
    @apply px-3 py-2 text-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors;
  }

  /* Search */
  .search-container {
    @apply relative;
  }

  .search-icon {
    @apply absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-lg;
  }

  .search-input {
    @apply w-full pl-12 pr-10 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all;
  }

  .search-clear {
    @apply absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors text-lg;
  }

  /* MCP Filters */
  .mcp-filters {
    @apply flex flex-wrap gap-2;
  }

  .mcp-filter-btn {
    @apply flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border;
    @apply bg-neutral-900 text-neutral-400 border-neutral-700 hover:border-neutral-600;
  }

  .mcp-filter-btn.active {
    @apply border-blue-500 bg-blue-600/20 text-blue-400;
  }

  .mcp-filter-icon {
    @apply text-base;
  }

  .mcp-filter-label {
    @apply hidden sm:inline;
  }

  .mcp-filter-count {
    @apply px-2 py-0.5 bg-neutral-800 text-neutral-300 text-xs rounded-full;
  }

  .mcp-filter-btn.active .mcp-filter-count {
    @apply bg-blue-600/30 text-blue-300;
  }

  .mcp-filter-selected {
    @apply px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium;
  }

  /* Color variants */
  .color-blue { @apply border-blue-500/50; }
  .color-blue.active { @apply border-blue-500 bg-blue-600/20 text-blue-400; }
  .color-purple { @apply border-purple-500/50; }
  .color-purple.active { @apply border-purple-500 bg-purple-600/20 text-purple-400; }
  .color-indigo { @apply border-indigo-500/50; }
  .color-indigo.active { @apply border-indigo-500 bg-indigo-600/20 text-indigo-400; }
  .color-green { @apply border-green-500/50; }
  .color-green.active { @apply border-green-500 bg-green-600/20 text-green-400; }
  .color-amber { @apply border-amber-500/50; }
  .color-amber.active { @apply border-amber-500 bg-amber-600/20 text-amber-400; }
  .color-cyan { @apply border-cyan-500/50; }
  .color-cyan.active { @apply border-cyan-500 bg-cyan-600/20 text-cyan-400; }
  .color-pink { @apply border-pink-500/50; }
  .color-pink.active { @apply border-pink-500 bg-pink-600/20 text-pink-400; }

  /* Loading/Error States */
  .loading-state {
    @apply flex flex-col items-center justify-center py-16;
  }

  .spinner {
    @apply inline-block animate-spin text-4xl mb-4;
  }

  .loading-text {
    @apply text-sm text-neutral-400;
  }

  .error-state {
    @apply bg-red-900/40 border-2 border-red-600/50 rounded-xl p-4 text-red-300 flex items-center gap-3;
  }

  .error-icon {
    @apply text-xl;
  }

  .error-text {
    @apply text-sm;
  }

  /* Tools Content */
  .tools-content {
    @apply space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
  }

  .tools-content::-webkit-scrollbar {
    width: 8px;
  }

  .tools-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .tools-content::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.3);
    border-radius: 4px;
  }

  .tools-content::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.5);
  }

  /* MCP Section */
  .mcp-section {
    @apply bg-neutral-900/50 border border-neutral-700 rounded-xl overflow-hidden;
  }

  .mcp-section-header {
    @apply flex items-center justify-between px-4 py-3 bg-neutral-800/30 border-b border-neutral-700;
  }

  .mcp-section-toggle {
    @apply flex items-center gap-3 flex-1 text-left hover:bg-neutral-800/50 transition-colors cursor-pointer;
  }

  .toggle-icon {
    @apply text-sm transition-transform;
  }

  .toggle-icon.expanded {
    @apply rotate-90;
  }

  .mcp-section-icon {
    @apply text-lg;
  }

  .mcp-section-name {
    @apply font-semibold text-white;
  }

  .mcp-section-count {
    @apply px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded-full;
  }

  .mcp-section-selected {
    @apply px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium;
  }

  .mcp-section-actions {
    @apply flex items-center gap-2;
  }

  .btn-select-all {
    @apply px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/50 rounded transition-colors;
  }

  .btn-deselect-all {
    @apply px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded transition-colors;
  }

  /* Tools Grid */
  .tools-grid {
    @apply grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4;
  }

  .tool-card {
    @apply relative bg-neutral-900/50 border border-neutral-700 rounded-lg p-4 transition-all cursor-pointer;
    @apply hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10;
  }

  .tool-card.selected {
    @apply border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-500/20;
  }

  .tool-card-header {
    @apply flex items-center justify-between mb-2;
  }

  .tool-checkbox-label {
    @apply flex items-center gap-2 cursor-pointer flex-1;
  }

  .tool-checkbox {
    @apply w-4 h-4 cursor-pointer accent-blue-500;
  }

  .tool-name {
    @apply text-sm font-semibold text-white;
  }

  .tool-selected-badge {
    @apply px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium;
  }

  .tool-description {
    @apply text-xs text-neutral-400 line-clamp-3 mb-3 leading-relaxed;
  }

  .tool-params {
    @apply space-y-2 pt-3 border-t border-neutral-700/50;
  }

  .tool-params-group {
    @apply flex items-center gap-2 flex-wrap;
  }

  .tool-params-label {
    @apply text-xs font-medium text-neutral-500;
  }

  .tool-params-tags {
    @apply flex flex-wrap gap-1;
  }

  .tool-param-tag {
    @apply px-2 py-0.5 text-xs rounded border;
  }

  .tool-param-tag.required {
    @apply bg-red-900/30 text-red-400 border-red-700/50;
  }

  .tool-param-tag.more {
    @apply bg-neutral-800 text-neutral-500 border-neutral-700;
  }

  .tool-params-count {
    @apply px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded;
  }

  /* Tool Tooltip */
  .tool-tooltip {
    @apply absolute z-50 bottom-full left-0 right-0 mb-2 p-4 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-700 rounded-xl shadow-2xl;
    @apply max-h-96 overflow-y-auto;
  }

  .tooltip-header {
    @apply flex items-center justify-between mb-3 pb-3 border-b border-neutral-700;
  }

  .tooltip-name {
    @apply font-bold text-white text-sm;
  }

  .tooltip-mcp {
    @apply px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded;
  }

  .tooltip-description {
    @apply text-sm text-neutral-300 mb-4 leading-relaxed;
  }

  .tooltip-section {
    @apply mb-3;
  }

  .tooltip-section strong {
    @apply text-xs text-neutral-400 uppercase mb-2 block;
  }

  .tooltip-list {
    @apply list-disc list-inside text-xs text-neutral-300 space-y-1 ml-2;
  }

  .tooltip-params-grid {
    @apply flex flex-wrap gap-1 mt-2;
  }

  .tooltip-param {
    @apply px-2 py-1 bg-neutral-800 text-neutral-300 text-xs rounded;
  }

  .tooltip-param-more {
    @apply px-2 py-1 bg-neutral-800/50 text-neutral-500 text-xs rounded italic;
  }

  /* Tools List View */
  .tools-list {
    @apply space-y-1 p-4;
  }

  .tool-list-item {
    @apply bg-neutral-900/30 border border-neutral-700 rounded-lg transition-all;
    @apply hover:border-blue-500/50 hover:bg-neutral-900/50;
  }

  .tool-list-item.selected {
    @apply border-blue-500 bg-blue-600/10;
  }

  .tool-list-checkbox {
    @apply flex items-start gap-3 p-4 cursor-pointer;
  }

  .tool-list-content {
    @apply flex-1 min-w-0;
  }

  .tool-list-header {
    @apply flex items-center justify-between gap-2 mb-2;
  }

  .tool-list-name {
    @apply text-sm font-semibold text-white;
  }

  .tool-list-badge {
    @apply px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-medium;
  }

  .tool-list-description {
    @apply text-xs text-neutral-400 mb-2 leading-relaxed;
  }

  .tool-list-params {
    @apply flex flex-wrap gap-3 text-xs text-neutral-500;
  }

  .tool-list-param-info {
    @apply flex items-center gap-1;
  }

  /* Empty States */
  .empty-filter {
    @apply text-center py-8 text-sm text-neutral-500 px-4;
  }

  .empty-state {
    @apply text-center py-16;
  }

  .empty-icon {
    @apply text-5xl mb-4 opacity-30;
  }

  .empty-title {
    @apply text-lg text-neutral-400 mb-2;
  }

  .empty-description {
    @apply text-sm text-neutral-500;
  }
</style>

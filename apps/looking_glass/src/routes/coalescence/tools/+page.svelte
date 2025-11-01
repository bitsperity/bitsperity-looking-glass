<script lang="ts">
  import { onMount } from 'svelte';
  import { coalescenceClient } from '$lib/coalescence-client';

  let allTools: any = null;
  let toolsByMcp: Record<string, any[]> = {};
  let selectedMcp: string | null = null;
  let loading = true;
  let error: string | null = null;
  let searchQuery = '';

  const mcps = ['satbase', 'tesseract', 'manifold', 'ariadne', 'coalescence', 'telegram'];
  
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
      
      // Load tools for each MCP
      const toolsPromises = mcps.map(async (mcp) => {
        try {
          const result = await coalescenceClient.listMcpTools(mcp);
          return { mcp, tools: result.tools || [] };
        } catch (e) {
          console.warn(`Failed to load tools for ${mcp}:`, e);
          return { mcp, tools: [] };
        }
      });

      const results = await Promise.all(toolsPromises);
      
      // Organize by MCP
      toolsByMcp = {};
      results.forEach(({ mcp, tools }) => {
        toolsByMcp[mcp] = tools;
      });

      // Calculate totals
      const totalTools = Object.values(toolsByMcp).reduce((sum, tools) => sum + tools.length, 0);
      allTools = { total: totalTools, byMcp: toolsByMcp };
    } catch (e: any) {
      error = `Failed to load tools: ${e.message}`;
      console.error('Error loading tools:', e);
    } finally {
      loading = false;
    }
  }

  function getFilteredTools() {
    let tools: any[] = [];
    
    if (!selectedMcp) {
      // Show all tools
      tools = Object.entries(toolsByMcp).flatMap(([mcp, toolList]) =>
        toolList.map((tool: any) => ({ ...tool, mcp }))
      );
    } else {
      // Show tools for selected MCP
      tools = (toolsByMcp[selectedMcp] || []).map((tool: any) => ({ ...tool, mcp: selectedMcp }));
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      tools = tools.filter((tool: any) =>
        tool.name?.toLowerCase().includes(query) ||
        tool.toolName?.toLowerCase().includes(query) ||
        tool.description?.toLowerCase().includes(query) ||
        tool.mcp?.toLowerCase().includes(query)
      );
    }
    
    return tools;
  }

  onMount(() => {
    loadTools();
  });
</script>

<div class="flex-1 overflow-auto px-8 pb-8">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-white flex items-center gap-3 mb-2">
      <span class="text-4xl">🔧</span>
      Tools Browser
    </h1>
    <p class="text-neutral-400">Alle verfügbaren Tools aus allen MCPs</p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-96">
      <div class="text-center">
        <div class="inline-block animate-spin text-5xl mb-4">⚙️</div>
        <div class="text-xl text-neutral-400 font-medium">Tools werden geladen...</div>
      </div>
    </div>
  {:else if error}
    <div class="bg-gradient-to-r from-red-900/40 to-red-800/30 border-2 border-red-600/50 rounded-xl p-5 mb-6 text-red-300 shadow-lg shadow-red-900/30 flex items-center gap-3">
      <span class="text-2xl">⚠️</span>
      <div>{error}</div>
    </div>
  {:else if allTools}
    <!-- Stats Cards -->
    <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-8">
      <div class="bg-gradient-to-br from-blue-900/40 to-neutral-800 border border-blue-700/30 rounded-xl p-6">
        <div class="text-sm font-medium text-blue-400 mb-2 uppercase">Total Tools</div>
        <div class="text-3xl font-bold text-white">{allTools.total}</div>
      </div>
      {#each mcps as mcp}
        {@const count = toolsByMcp[mcp]?.length || 0}
        <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6">
          <div class="text-sm font-medium text-neutral-400 mb-2 uppercase">{mcpLabels[mcp] || mcp}</div>
          <div class="text-3xl font-bold text-white">{count}</div>
        </div>
      {/each}
    </div>

    <!-- Filters -->
    <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 mb-6">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex-1 min-w-[300px]">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="🔍 Tool suchen..."
            class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div class="flex gap-2 flex-wrap">
          <button
            on:click={() => selectedMcp = null}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all {
              selectedMcp === null
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
            }"
          >
            All MCPs
          </button>
          {#each mcps as mcp}
            <button
              on:click={() => selectedMcp = mcp}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all {
                selectedMcp === mcp
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
              }"
            >
              {mcpLabels[mcp] || mcp}
              {#if toolsByMcp[mcp]}
                <span class="ml-2 opacity-70">({toolsByMcp[mcp].length})</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Tools Grid -->
    {#if getFilteredTools().length === 0}
      <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-16 text-center">
        <div class="text-6xl mb-4 opacity-30">🔍</div>
        <div class="text-2xl text-neutral-400 mb-2">Keine Tools gefunden</div>
        <div class="text-sm text-neutral-500">Versuche eine andere Suche oder einen anderen MCP</div>
      </div>
    {:else}
      <div class="grid grid-cols-2 gap-4">
        {#each getFilteredTools() as tool}
          <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-5 hover:border-blue-500/50 transition-all">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="font-bold text-white text-lg">{tool.name || 'Unknown Tool'}</span>
                  {#if tool.mcp}
                    <span class="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-700/30">
                      {tool.mcp}
                    </span>
                  {/if}
                </div>
                {#if tool.description}
                  <div class="text-sm text-neutral-300 line-clamp-2">{tool.description}</div>
                {/if}
              </div>
            </div>
            
            {#if tool.inputSchema && tool.inputSchema.properties}
              <div class="mt-3 pt-3 border-t border-neutral-700/50">
                <div class="text-xs font-medium text-neutral-400 mb-2 uppercase">Parameters</div>
                <div class="flex flex-wrap gap-2">
                  {#each Object.keys(tool.inputSchema.properties) as param}
                    {@const paramSchema = tool.inputSchema.properties[param]}
                    <span class="px-2 py-1 bg-neutral-900/50 text-neutral-400 text-xs rounded border border-neutral-700/50">
                      {param}
                      {#if paramSchema.type}
                        <span class="opacity-70">: {paramSchema.type}</span>
                      {/if}
                      {#if tool.inputSchema.required && tool.inputSchema.required.includes(param)}
                        <span class="text-red-400 ml-1">*</span>
                      {/if}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>


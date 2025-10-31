<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { coalescenceClient, type AgentConfig } from '$lib/coalescence-client';
  import StatusBadge from '$lib/components/coalescence/StatusBadge.svelte';
  import CostDisplay from '$lib/components/coalescence/CostDisplay.svelte';
  import TokenDisplay from '$lib/components/coalescence/TokenDisplay.svelte';

  let agent: AgentConfig | null = null;
  let agentStats: any = null;
  let context: any = null;
  let insights: any = null;
  let messages: any = null;
  let loading = true;
  let loadingTab = false;
  let error: string | null = null;
  let activeTab: 'overview' | 'stats' | 'context' | 'insights' | 'messages' = 'overview';
  let daysBack = 7;

  const agentName = $page.params.name;

  async function loadAgent() {
    try {
      loading = true;
      error = null;
      agent = await coalescenceClient.getAgent(agentName);
    } catch (e: any) {
      error = `Failed to load agent: ${e.message}`;
      console.error('Error loading agent:', e);
    } finally {
      loading = false;
    }
  }

  async function loadTabData() {
    if (!agent) return;
    
    try {
      loadingTab = true;
      
      if (activeTab === 'stats') {
        agentStats = await coalescenceClient.getAgentStats(agentName, daysBack);
      } else if (activeTab === 'context') {
        context = await coalescenceClient.getRunContext(agentName, daysBack);
      } else if (activeTab === 'insights') {
        insights = await coalescenceClient.getInsights(agentName, daysBack);
      } else if (activeTab === 'messages') {
        messages = await coalescenceClient.getMessages(agentName, true);
      }
    } catch (e: any) {
      console.error(`Error loading ${activeTab}:`, e);
    } finally {
      loadingTab = false;
    }
  }

  // Load tab data when switching tabs
  $: if (agent && activeTab !== 'overview') {
    loadTabData();
  }

  function formatDate(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleString();
  }

  async function markMessageAsRead(messageId: string) {
    try {
      await coalescenceClient.markMessageRead(messageId);
      if (messages?.messages) {
        const msg = messages.messages.find((m: any) => m.id === messageId);
        if (msg) msg.read_at = new Date().toISOString();
      }
    } catch (e) {
      console.error('Failed to mark message as read:', e);
    }
  }

  onMount(async () => {
    await loadAgent();
    if (agent) await loadTabData();
  });
</script>

<div class="flex-1 overflow-auto px-8 pb-8">
  {#if loading}
    <div class="flex items-center justify-center h-96">
      <div class="text-center">
        <div class="inline-block animate-spin text-5xl mb-4">⚙️</div>
        <div class="text-xl text-neutral-400 font-medium">Agent wird geladen...</div>
      </div>
    </div>
  {:else if error}
    <div class="bg-gradient-to-r from-red-900/40 to-red-800/30 border-2 border-red-600/50 rounded-xl p-5 mb-6 text-red-300 shadow-lg shadow-red-900/30 flex items-center gap-3">
      <span class="text-2xl">⚠️</span>
      <div>{error}</div>
    </div>
  {:else if agent}
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-4">
          <button
            on:click={() => goto('/coalescence/agents')}
            class="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
            title="Zurück"
          >
            ← Zurück
          </button>
          <h1 class="text-3xl font-bold text-white flex items-center gap-3">
            <span class="text-4xl">🤖</span>
            {agent.name}
          </h1>
          <StatusBadge status={agent.enabled ? 'success' : 'error'} />
        </div>
        <button
          on:click={() => goto(`/coalescence/agents?edit=${agent.name}`)}
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>✏️</span>
          Bearbeiten
        </button>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-4 gap-6 mb-6">
        <div class="bg-gradient-to-br from-blue-900/40 to-neutral-800 border border-blue-700/30 rounded-xl p-6">
          <div class="text-sm font-medium text-blue-400 mb-2 uppercase">Model</div>
          <div class="text-2xl font-bold text-white">{agent.model}</div>
        </div>
        <div class="bg-gradient-to-br from-purple-900/40 to-neutral-800 border border-purple-700/30 rounded-xl p-6">
          <div class="text-sm font-medium text-purple-400 mb-2 uppercase">Schedule</div>
          <div class="text-lg font-mono text-white">{agent.schedule}</div>
        </div>
        <div class="bg-gradient-to-br from-emerald-900/40 to-neutral-800 border border-emerald-700/30 rounded-xl p-6">
          <div class="text-sm font-medium text-emerald-400 mb-2 uppercase">Turns</div>
          <div class="text-2xl font-bold text-white">{agent.turns?.length || 0}</div>
        </div>
        <div class="bg-gradient-to-br from-amber-900/40 to-neutral-800 border border-amber-700/30 rounded-xl p-6">
          <div class="text-sm font-medium text-amber-400 mb-2 uppercase">Budget (Daily)</div>
          <div class="text-2xl font-bold text-white">{agent.budget_daily_tokens?.toLocaleString() || '0'}</div>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-nav mb-6">
      <button 
        class="tab-btn {activeTab === 'overview' ? 'active' : ''}"
        on:click={() => activeTab = 'overview'}
      >
        📊 Overview
      </button>
      <button 
        class="tab-btn {activeTab === 'stats' ? 'active' : ''}"
        on:click={() => activeTab = 'stats'}
      >
        📈 Stats
      </button>
      <button 
        class="tab-btn {activeTab === 'context' ? 'active' : ''}"
        on:click={() => activeTab = 'context'}
      >
        🧠 Context
      </button>
      <button 
        class="tab-btn {activeTab === 'insights' ? 'active' : ''}"
        on:click={() => activeTab = 'insights'}
      >
        💡 Insights
      </button>
      <button 
        class="tab-btn {activeTab === 'messages' ? 'active' : ''}"
        on:click={() => activeTab = 'messages'}
      >
        📨 Messages
        {#if messages?.count > 0}
          <span class="tab-badge">{messages.count}</span>
        {/if}
      </button>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'overview'}
      <!-- Overview Tab -->
      <div class="space-y-6">
        <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6">
          <h3 class="text-lg font-bold text-white mb-4">Agent Configuration</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-medium text-neutral-400 mb-1 uppercase">System Prompt</div>
              <div class="text-sm text-neutral-300 whitespace-pre-wrap">{agent.system_prompt || 'None'}</div>
            </div>
            <div>
              <div class="text-xs font-medium text-neutral-400 mb-1 uppercase">Max Steps</div>
              <div class="text-sm text-white">{agent.max_steps || 'N/A'}</div>
            </div>
            <div>
              <div class="text-xs font-medium text-neutral-400 mb-1 uppercase">Timeout</div>
              <div class="text-sm text-white">{agent.timeout_minutes || 'N/A'} minutes</div>
            </div>
            <div>
              <div class="text-xs font-medium text-neutral-400 mb-1 uppercase">Max Tokens per Turn</div>
              <div class="text-sm text-white">{agent.max_tokens_per_turn || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6">
          <h3 class="text-lg font-bold text-white mb-4">Turns ({agent.turns?.length || 0})</h3>
          {#if agent.turns && agent.turns.length > 0}
            <div class="space-y-3">
              {#each agent.turns as turn, idx}
                <div class="bg-neutral-900/50 border border-neutral-700/50 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div class="font-bold text-white">{turn.name || `Turn ${idx + 1}`}</div>
                        <div class="text-xs text-neutral-400">{turn.max_tokens || 1500} tokens max</div>
                      </div>
                    </div>
                    {#if turn.model}
                      <div class="text-xs text-neutral-500 font-mono">{turn.model}</div>
                    {/if}
                  </div>
                  {#if turn.mcps && turn.mcps.length > 0}
                    <div class="flex flex-wrap gap-2 mt-2">
                      {#each turn.mcps as mcp}
                        <span class="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-700/30">
                          {mcp}
                        </span>
                      {/each}
                    </div>
                  {/if}
                  {#if turn.prompt}
                    <div class="mt-2 text-xs text-neutral-400 italic line-clamp-2">{turn.prompt}</div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-center py-8 text-neutral-400">
              <div class="text-4xl mb-2 opacity-30">🔄</div>
              <p>No turns configured</p>
            </div>
          {/if}
        </div>
      </div>

    {:else if activeTab === 'stats'}
      <!-- Stats Tab -->
      {#if loadingTab}
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="inline-block animate-spin text-4xl mb-4">⚙️</div>
            <div class="text-neutral-400">Loading stats...</div>
          </div>
        </div>
      {:else if agentStats}
        <div class="space-y-6">
          <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-white">Performance Stats</h3>
              <select
                bind:value={daysBack}
                on:change={() => loadTabData()}
                class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-white"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <div class="text-xs font-medium text-neutral-400 mb-1 uppercase">Total Runs</div>
                <div class="text-2xl font-bold text-white">{agentStats.totalRuns || 0}</div>
              </div>
              <div>
                <div class="text-xs font-medium text-neutral-400 mb-1 uppercase">Total Tokens</div>
                <div class="text-2xl font-bold text-blue-400">
                  <TokenDisplay tokens={agentStats.totalTokens || 0} />
                </div>
              </div>
              <div>
                <div class="text-xs font-medium text-neutral-400 mb-1 uppercase">Total Cost</div>
                <div class="text-2xl font-bold text-emerald-400">
                  <CostDisplay cost={parseFloat(agentStats.totalCost || 0)} showDetail={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="text-center py-12 text-neutral-400">
          <div class="text-5xl mb-4 opacity-30">📊</div>
          <p>No stats available</p>
        </div>
      {/if}

    {:else if activeTab === 'context'}
      <!-- Context Tab -->
      {#if loadingTab}
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="inline-block animate-spin text-4xl mb-4">⚙️</div>
            <div class="text-neutral-400">Loading context...</div>
          </div>
        </div>
      {:else if context?.context}
        <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6">
          <div class="mb-4">
            <h3 class="text-lg font-bold text-white mb-2">Run Context</h3>
            <p class="text-sm text-neutral-400">Last {context.days_back} days</p>
          </div>
          <div class="space-y-4">
            {#if context.context.context_summary}
              <div>
                <div class="text-xs font-medium text-neutral-400 mb-2 uppercase">Summary</div>
                <div class="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-900/50 p-4 rounded-lg border border-neutral-700/50">
                  {context.context.context_summary}
                </div>
              </div>
            {/if}
            {#if context.context.kg_entities && context.context.kg_entities.length > 0}
              <div>
                <div class="text-xs font-medium text-neutral-400 mb-2 uppercase">KG Entities</div>
                <div class="flex flex-wrap gap-2">
                  {#each context.context.kg_entities as entity}
                    <span class="px-3 py-1 bg-purple-900/30 text-purple-400 text-xs rounded border border-purple-700/30">
                      {entity}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="text-center py-12 text-neutral-400">
          <div class="text-5xl mb-4 opacity-30">🧠</div>
          <p>No context available</p>
        </div>
      {/if}

    {:else if activeTab === 'insights'}
      <!-- Insights Tab -->
      {#if loadingTab}
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="inline-block animate-spin text-4xl mb-4">⚙️</div>
            <div class="text-neutral-400">Loading insights...</div>
          </div>
        </div>
      {:else if insights?.insights && insights.insights.length > 0}
        <div class="space-y-4">
          {#each insights.insights as insight}
            <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-1 rounded text-xs font-bold {
                    insight.priority === 'high' ? 'bg-red-900/30 text-red-400 border border-red-700/30' :
                    insight.priority === 'medium' ? 'bg-amber-900/30 text-amber-400 border border-amber-700/30' :
                    'bg-blue-900/30 text-blue-400 border border-blue-700/30'
                  }">
                    {insight.priority || 'medium'}
                  </span>
                  {#if insight.run_id}
                    <a
                      href="/coalescence/runs/{insight.run_id}"
                      class="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Run: {insight.run_id.slice(0, 8)}...
                    </a>
                  {/if}
                </div>
                <div class="text-xs text-neutral-500">{formatDate(insight.created_at)}</div>
              </div>
              <div class="text-sm text-neutral-300 whitespace-pre-wrap mb-3">{insight.insight}</div>
              {#if insight.related_entities && insight.related_entities.length > 0}
                <div class="flex flex-wrap gap-2">
                  {#each insight.related_entities as entity}
                    <span class="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded border border-purple-700/30">
                      {entity}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center py-12 text-neutral-400">
          <div class="text-5xl mb-4 opacity-30">💡</div>
          <p>No insights available</p>
        </div>
      {/if}

    {:else if activeTab === 'messages'}
      <!-- Messages Tab -->
      {#if loadingTab}
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="inline-block animate-spin text-4xl mb-4">⚙️</div>
            <div class="text-neutral-400">Loading messages...</div>
          </div>
        </div>
      {:else if messages?.messages && messages.messages.length > 0}
        <div class="space-y-4">
          {#each messages.messages as message}
            <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 {
              !message.read_at ? 'border-blue-500/50 bg-blue-900/10' : ''
            }">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-1 rounded text-xs font-bold bg-blue-900/30 text-blue-400 border border-blue-700/30">
                    {message.type}
                  </span>
                  <span class="text-sm text-neutral-400">from <strong class="text-white">{message.from_agent}</strong></span>
                  {#if !message.read_at}
                    <span class="px-2 py-0.5 bg-blue-600 text-white text-xs rounded font-bold">NEW</span>
                  {/if}
                </div>
                <div class="flex items-center gap-2">
                  <div class="text-xs text-neutral-500">{formatDate(message.created_at)}</div>
                  {#if !message.read_at}
                    <button
                      on:click={() => markMessageAsRead(message.id)}
                      class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                    >
                      Mark Read
                    </button>
                  {/if}
                </div>
              </div>
              <div class="text-sm text-neutral-300 whitespace-pre-wrap mb-3">{message.content}</div>
              {#if message.related_entities && message.related_entities.length > 0}
                <div class="flex flex-wrap gap-2">
                  {#each message.related_entities as entity}
                    <span class="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded border border-purple-700/30">
                      {entity}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center py-12 text-neutral-400">
          <div class="text-5xl mb-4 opacity-30">📨</div>
          <p>No messages available</p>
        </div>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .tab-nav {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .tab-btn {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: rgba(255, 255, 255, 0.6);
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
    bottom: -1px;
  }

  .tab-btn:hover {
    color: rgba(255, 255, 255, 0.8);
  }

  .tab-btn.active {
    color: white;
    border-bottom-color: #3b82f6;
  }

  .tab-badge {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.75rem;
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: #93c5fd;
  }
</style>


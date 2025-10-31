<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { coalescenceClient, type RunDetail } from '$lib/coalescence-client';
  import StatusBadge from '$lib/components/coalescence/StatusBadge.svelte';
  import CostDisplay from '$lib/components/coalescence/CostDisplay.svelte';

  let run: RunDetail | null = null;
  let toolBreakdown: any = null;
  let loading = true;
  let loadingTools = false;
  let error: string | null = null;
  let activeTab: 'chat' | 'tools' = 'chat';
  let expandedTools: Set<string> = new Set();
  let expandedMessages: Set<string> = new Set();

  const runId = $page.params.id;

  async function loadRun() {
    try {
      const data = await coalescenceClient.getRun(runId);
      run = data;
      error = null;
    } catch (e: any) {
      error = `Failed to load run: ${e.message}`;
      console.error('Error loading run:', e);
    } finally {
      loading = false;
    }
  }

  async function loadToolBreakdown() {
    if (toolBreakdown || loadingTools) return;
    
    try {
      loadingTools = true;
      toolBreakdown = await coalescenceClient.getRunToolsDetailed(runId);
    } catch (e: any) {
      console.error('Error loading tool breakdown:', e);
    } finally {
      loadingTools = false;
    }
  }

  // Load tool breakdown when switching to tools tab
  $: if (activeTab === 'tools' && run) {
    loadToolBreakdown();
  }

  function toggleTool(toolId: string) {
    if (expandedTools.has(toolId)) {
      expandedTools.delete(toolId);
    } else {
      expandedTools.add(toolId);
    }
    expandedTools = expandedTools;
  }

  function toggleMessage(messageId: string) {
    if (expandedMessages.has(messageId)) {
      expandedMessages.delete(messageId);
    } else {
      expandedMessages.add(messageId);
    }
    expandedMessages = expandedMessages;
  }

  function buildTimeline(messages: any[], toolCalls: any[]) {
    const timeline: any[] = [];
    
    // Add all messages
    messages.forEach((msg, idx) => {
      timeline.push({
        type: 'message',
        index: idx,
        ...msg
      });
    });
    
    // Add all tool calls
    toolCalls.forEach((tool, idx) => {
      timeline.push({
        type: 'toolCall',
        index: idx,
        ...tool
      });
    });
    
    // Sort by timestamp
    timeline.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
    
    return timeline;
  }

  function formatTime(ms: number | undefined): string {
    if (!ms || isNaN(ms)) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  function formatTokens(tokens: number | undefined): string {
    if (!tokens) return '0';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return `${tokens}`;
  }

  // Helper to access MCP stats with proper typing
  function getMcpStats(stats: unknown): any {
    return stats as any;
  }

  onMount(async () => {
    await loadRun();
  });
</script>

<div class="run-details">
  <!-- Header -->
  <div class="header">
    <div class="header-top">
      <div class="title-section">
        <h1>{run?.meta.agent || 'Agent'}</h1>
        {#if run}
          <StatusBadge status={run.meta.status} />
        {/if}
      </div>
      <div class="run-id">{runId}</div>
      <button class="refresh-btn" on:click={loadRun}>🔄 Refresh</button>
    </div>

    <!-- Meta Info -->
    {#if run}
      <div class="meta-info">
        <div class="meta-item">
          <span class="label">Model</span>
          <span class="value">{run.meta.model || '❌ Unknown'}</span>
        </div>
        <div class="meta-item">
          <span class="label">Tokens</span>
          <span class="value">
            <span class="token-display">{formatTokens(run.tokens.total)}</span>
            <span class="detail">({formatTokens(run.tokens.input)} in / {formatTokens(run.tokens.output)} out)</span>
          </span>
        </div>
        <div class="meta-item">
          <span class="label">Cost</span>
          <span class="value">
            <CostDisplay cost={run.cost.usd} />
          </span>
        </div>
        <div class="meta-item">
          <span class="label">Duration</span>
          <span class="value">{formatTime(run.meta.durationSeconds ? run.meta.durationSeconds * 1000 : undefined)}</span>
        </div>
      </div>

      <!-- Summary -->
      <div class="summary">
        <span class="turns-count">{run.execution.turnsCompleted}/{run.execution.turnsTotal}</span>
        <span class="summary-text">turns completed</span>
        <span class="tool-count">· {run.execution.totalToolCalls} tool calls</span>
      </div>
    {/if}
  </div>

  <!-- Tab Navigation -->
  {#if run}
    <div class="tab-nav">
      <button 
        class="tab-btn {activeTab === 'chat' ? 'active' : ''}"
        on:click={() => activeTab = 'chat'}
      >
        💬 Chat
      </button>
      <button 
        class="tab-btn {activeTab === 'tools' ? 'active' : ''}"
        on:click={() => activeTab = 'tools'}
      >
        🔧 Tools
        {#if run.execution.totalToolCalls > 0}
          <span class="tab-badge">{run.execution.totalToolCalls}</span>
        {/if}
      </button>
    </div>
  {/if}

  <!-- Content Area -->
  {#if loading}
    <div class="loading">Loading run details...</div>
  {:else if error}
    <div class="error-box">{error}</div>
  {:else if run && activeTab === 'chat'}
    <!-- Chat Tab -->
    <div class="chat-container">
      {#each run.turns || [] as turn}
        <!-- Turn Separator -->
        <div class="turn-separator">
          <div class="separator-line"></div>
          <div class="separator-label">
            <span class="turn-number">Turn {turn.number}</span>
            <span class="turn-name">{turn.name || 'Turn'}</span>
            
            <!-- Expanded metadata display like dashboard -->
            <div class="turn-metadata">
              {#if turn.duration?.ms}
                <div class="metadata-badge">
                  <span class="metadata-icon">⏱️</span>
                  <span class="metadata-label">Duration</span>
                  <span class="metadata-value">{formatTime(turn.duration.ms)}</span>
                </div>
              {/if}
              
              {#if turn.tokens?.input !== undefined}
                <div class="metadata-badge">
                  <span class="metadata-icon">📊</span>
                  <span class="metadata-label">Input</span>
                  <span class="metadata-value">{formatTokens(turn.tokens.input)}</span>
                </div>
              {/if}
              
              {#if turn.tokens?.output !== undefined}
                <div class="metadata-badge">
                  <span class="metadata-icon">📤</span>
                  <span class="metadata-label">Output</span>
                  <span class="metadata-value">{formatTokens(turn.tokens.output)}</span>
                </div>
              {/if}
              
              {#if turn.cost !== undefined && turn.cost !== null}
                <div class="metadata-badge">
                  <span class="metadata-icon">💵</span>
                  <span class="metadata-label">Cost</span>
                  <span class="metadata-value">${turn.cost.toFixed(4)}</span>
                </div>
              {/if}
            </div>
          </div>
          <div class="separator-line"></div>
        </div>

        <!-- Messages and Tool Calls Timeline -->
        {#each buildTimeline(turn.messages || [], turn.toolCalls || []) as item, itemIdx}
          {@const isMessage = item.type === 'message'}
          {@const isToolCall = item.type === 'toolCall'}
          {@const messageId = `${turn.number}-msg-${item.index}`}
          {@const toolId = `${turn.number}-tool-${item.index}`}
          {@const isCollapsed = isMessage && (item.message_type === 'system' || item.message_type === 'rules')}
          {@const isExpanded = isMessage ? expandedMessages.has(messageId) : expandedTools.has(toolId)}
          
          {#if isMessage}
            {#if item.message_type === 'system' || item.message_type === 'rules'}
              <!-- Collapsible System/Rules Message -->
              <div class="message-collapsible">
                <button 
                  class="message-trigger"
                  on:click={() => toggleMessage(messageId)}
                >
                  <span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  <span class="message-label">
                    {item.message_type === 'system' ? '⚙️ System Prompt' : '📋 Rules'}
                  </span>
                </button>
                {#if isExpanded}
                  <div class="message-content collapsible">
                    <div class="message-text">
                      {item.content}
                    </div>
                  </div>
                {/if}
              </div>
            {:else}
              <!-- Regular Message (User/Assistant) -->
              <div class="message {item.role}-message">
                <div class="message-avatar">
                  {#if item.role === 'assistant'}
                    🤖
                  {:else if item.role === 'user'}
                    👤
                  {:else}
                    ⚙️
                  {/if}
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-role">{item.role === 'assistant' ? 'Assistant' : item.role === 'user' ? 'User' : 'System'}</span>
                    <span class="message-time">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div class="message-text">
                    {item.content}
                  </div>
                </div>
              </div>
            {/if}
          {:else if isToolCall}
            <!-- Tool Call in Timeline -->
            <div class="tool-call-item timeline-tool">
              <button 
                class="tool-call-trigger"
                on:click={() => toggleTool(toolId)}
              >
                <span class="expand-icon">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span class="tool-name">{item.name || 'Unknown Tool'}</span>
                <span class="tool-status">
                  {#if item.status === 'success'}
                    <span class="status-badge success">✅</span>
                  {:else if item.status === 'error'}
                    <span class="status-badge error">❌</span>
                  {:else}
                    <span class="status-badge pending">⏳</span>
                  {/if}
                </span>
                {#if item.duration}
                  <span class="tool-duration">{formatTime(item.duration.ms)}</span>
                {/if}
                <span class="tool-time">{new Date(item.timestamp).toLocaleTimeString()}</span>
              </button>

              {#if isExpanded}
                <div class="tool-details">
                  {#if item.args && Object.keys(item.args).length > 0}
                    <div class="detail-section">
                      <div class="detail-label">Arguments:</div>
                      <pre class="detail-content">{JSON.stringify(JSON.parse(typeof item.args === 'string' ? item.args : JSON.stringify(item.args)), null, 2)}</pre>
                    </div>
                  {/if}
                  {#if item.result}
                    <div class="detail-section">
                      <div class="detail-label">Result:</div>
                      <pre class="detail-content">{JSON.stringify(JSON.parse(typeof item.result === 'string' ? item.result : JSON.stringify(item.result)), null, 2)}</pre>
                    </div>
                  {/if}
                  {#if item.error}
                    <div class="detail-section error">
                      <div class="detail-label">Error:</div>
                      <pre class="detail-content">{item.error}</pre>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        {/each}
      {/each}
    </div>
  {:else if run && activeTab === 'tools'}
    <!-- Tools Breakdown Tab -->
    <div class="tools-container">
      {#if loadingTools}
        <div class="loading">Loading tool breakdown...</div>
      {:else if toolBreakdown}
        <!-- Tool Stats Overview -->
        <div class="tool-stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Tools</div>
            <div class="stat-value">{toolBreakdown.totalTools || 0}</div>
          </div>
          <div class="stat-card success">
            <div class="stat-label">✅ Success</div>
            <div class="stat-value">{toolBreakdown.byStatus?.success || 0}</div>
          </div>
          <div class="stat-card error">
            <div class="stat-label">❌ Error</div>
            <div class="stat-value">{toolBreakdown.byStatus?.error || 0}</div>
          </div>
          <div class="stat-card pending">
            <div class="stat-label">⏳ Pending</div>
            <div class="stat-value">{toolBreakdown.byStatus?.pending || 0}</div>
          </div>
        </div>

        <!-- MCP Breakdown -->
        {#if toolBreakdown.byMcp && Object.keys(toolBreakdown.byMcp).length > 0}
          <div class="mcp-breakdown">
            <h3 class="section-title">📦 MCP Breakdown</h3>
            <div class="mcp-grid">
              {#each Object.entries(toolBreakdown.byMcp) as [mcpName, stats]}
                {@const mcpStats = getMcpStats(stats)}
                <div class="mcp-card">
                  <div class="mcp-header">
                    <span class="mcp-name">{mcpName}</span>
                    <span class="mcp-count">{mcpStats.count} tools</span>
                  </div>
                  <div class="mcp-stats">
                    <div class="mcp-stat">
                      <span class="mcp-stat-value success">{mcpStats.success || 0}</span>
                      <span class="mcp-stat-label">✅</span>
                    </div>
                    <div class="mcp-stat">
                      <span class="mcp-stat-value error">{mcpStats.error || 0}</span>
                      <span class="mcp-stat-label">❌</span>
                    </div>
                    <div class="mcp-stat">
                      <span class="mcp-stat-value">{formatTime(mcpStats.avgDuration || 0)}</span>
                      <span class="mcp-stat-label">avg</span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Tool Timeline -->
        {#if toolBreakdown.timeline && toolBreakdown.timeline.length > 0}
          <div class="tool-timeline">
            <h3 class="section-title">📊 Tool Timeline</h3>
            <div class="timeline-list">
              {#each toolBreakdown.timeline as tool, idx}
                {@const toolId = `tool-${idx}`}
                {@const isExpanded = expandedTools.has(toolId)}
                <div class="timeline-item">
                  <button 
                    class="timeline-trigger"
                    on:click={() => toggleTool(toolId)}
                  >
                    <span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    <span class="timeline-turn">Turn {tool.turnNumber}</span>
                    <span class="timeline-tool-name">{tool.toolName}</span>
                    <span class="timeline-status {tool.status}">
                      {#if tool.status === 'success'}
                        ✅
                      {:else if tool.status === 'error'}
                        ❌
                      {:else}
                        ⏳
                      {/if}
                    </span>
                    <span class="timeline-duration">{formatTime(tool.duration)}</span>
                    <span class="timeline-time">{new Date(tool.timestamp).toLocaleTimeString()}</span>
                  </button>
                  
                  {#if isExpanded}
                    <div class="timeline-details">
                      {#if tool.args}
                        <div class="detail-section">
                          <div class="detail-label">Arguments:</div>
                          <pre class="detail-content">{JSON.stringify(tool.args, null, 2)}</pre>
                        </div>
                      {/if}
                      {#if tool.error}
                        <div class="detail-section error">
                          <div class="detail-label">Error:</div>
                          <pre class="detail-content">{tool.error}</pre>
                        </div>
                      {/if}
                      <div class="detail-section">
                        <div class="detail-label">Result Size:</div>
                        <div class="detail-content">{tool.resultSize ? `${(tool.resultSize / 1024).toFixed(1)} KB` : 'N/A'}</div>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {:else}
        <div class="empty-state">No tool breakdown available</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .run-details {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 2rem;
    padding: 2rem;
    background: linear-gradient(135deg, rgba(0,0,0,0.2) 0%, transparent 100%);
  }

  /* Header */
  .header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 2rem;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .title-section h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    background: linear-gradient(135deg, #fff, rgba(255, 255, 255, 0.8));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .run-id {
    font-family: 'Monaco', monospace;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
    flex-grow: 1;
    text-align: right;
  }

  .refresh-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .refresh-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.02);
  }

  /* Meta Info */
  .meta-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.5);
  }

  .value {
    font-size: 0.95rem;
    color: white;
    font-weight: 600;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .token-display {
    font-family: 'Monaco', monospace;
    font-size: 1.05rem;
  }

  .detail {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Summary */
  .summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .turns-count {
    font-weight: 700;
    color: white;
    font-size: 1rem;
  }

  .summary-text {
    color: rgba(255, 255, 255, 0.6);
  }

  .tool-count {
    color: rgba(255, 255, 255, 0.5);
  }

  /* Chat Container */
  .chat-container {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-right: 0.5rem;
  }

  /* Turn Separator */
  .turn-separator {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 2rem 0 1.5rem 0;
  }

  .separator-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  }

  .separator-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .turn-number {
    font-weight: 700;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.65rem;
  }

  .turn-name {
    font-weight: 600;
    color: white;
  }

  .turn-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: 0.75rem;
    padding-left: 0.75rem;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  .meta-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
  }

  /* Messages */
  .message {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message-avatar {
    font-size: 1.5rem;
    min-width: 2.5rem;
    text-align: center;
    margin-top: 0.2rem;
  }

  .message-content {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    padding: 0.9rem;
    backdrop-filter: blur(10px);
  }

  /* Color-coded messages based on role */
  .assistant-message .message-content {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .assistant-message .message-role {
    color: #6ee7b7;
  }

  .user-message .message-content {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%);
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  .user-message .message-role {
    color: #93c5fd;
  }

  .system-message .message-content {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.08) 0%, rgba(107, 114, 128, 0.04) 100%);
    border: 1px solid rgba(107, 114, 128, 0.2);
  }

  .system-message .message-role {
    color: #d1d5db;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.6rem;
    gap: 0.5rem;
  }

  .message-role {
    font-weight: 700;
    color: white;
    font-size: 0.85rem;
  }

  .message-time {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .message-text {
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.6;
    font-size: 0.88rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }

  /* Tool Calls */
  .tool-calls-section {
    margin: 0.75rem 0 0 3rem;
  }

  .tool-calls-header {
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .tool-calls-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .tool-call-item {
    display: flex;
    flex-direction: column;
  }

  .tool-call-trigger {
    background: linear-gradient(135deg, rgba(180, 83, 9, 0.08) 0%, rgba(180, 83, 9, 0.04) 100%);
    border: 1px solid rgba(180, 83, 9, 0.2);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    text-align: left;
    font-weight: 600;
  }

  .tool-call-trigger:hover {
    background: linear-gradient(135deg, rgba(180, 83, 9, 0.12) 0%, rgba(180, 83, 9, 0.06) 100%);
    border-color: rgba(180, 83, 9, 0.3);
  }

  .expand-icon {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.6rem;
    min-width: 0.8rem;
    text-align: center;
  }

  .tool-name {
    font-weight: 600;
    color: #fcd34d;
    flex: 1;
  }

  .tool-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .status-badge {
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-badge.success {
    color: #86efac;
    background: rgba(16, 185, 129, 0.15);
    padding: 0.2rem 0.5rem;
    border-radius: 0.3rem;
  }

  .status-badge.error {
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.15);
    padding: 0.2rem 0.5rem;
    border-radius: 0.3rem;
  }

  .status-badge.pending {
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.15);
    padding: 0.2rem 0.5rem;
    border-radius: 0.3rem;
  }

  .tool-duration {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
    font-family: 'Monaco', monospace;
    min-width: 3.5rem;
    text-align: right;
  }

  .tool-time {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.7rem;
    margin-left: auto;
  }

  .timeline-tool {
    margin-bottom: 0.5rem;
  }

  .tool-details {
    margin-top: 0.4rem;
    padding: 0;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(180, 83, 9, 0.15);
    border-radius: 0 0 0.75rem 0.75rem;
    border-top: none;
    overflow: hidden;
  }

  .detail-section {
    padding: 0.8rem;
    border-bottom: 1px solid rgba(180, 83, 9, 0.08);
  }

  .detail-section:last-child {
    border-bottom: none;
  }

  .detail-section.error {
    background: rgba(239, 68, 68, 0.1);
  }

  .detail-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #fbbf24;
    margin-bottom: 0.5rem;
  }

  .detail-content {
    margin: 0;
    font-family: 'Monaco', monospace;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.75);
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
    line-height: 1.4;
  }

  /* Collapsible Messages */
  .message-collapsible {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5rem;
  }

  .message-trigger {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.08) 0%, rgba(107, 114, 128, 0.04) 100%);
    border: 1px solid rgba(107, 114, 128, 0.2);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.2s ease;
    text-align: left;
  }

  .message-trigger:hover {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.12) 0%, rgba(107, 114, 128, 0.06) 100%);
    border-color: rgba(107, 114, 128, 0.3);
  }

  .message-label {
    color: #d1d5db;
    font-weight: 700;
  }

  .message-content.collapsible {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(107, 114, 128, 0.15);
    border-top: none;
    border-radius: 0 0 0.75rem 0.75rem;
    padding: 1rem;
    margin-top: 0;
  }

  /* States */
  .loading, .error-box {
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
  }

  .error-box {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.75rem;
    color: #fca5a5;
  }

  /* Scrollbar */
  .chat-container::-webkit-scrollbar {
    width: 6px;
  }

  .chat-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .chat-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .detail-content::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  .detail-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .detail-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  /* New styles for turn metadata */
  .turn-metadata {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: 0.75rem;
    padding-left: 0.75rem;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  .metadata-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 0.4rem;
    padding: 0.3rem 0.7rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: white;
    backdrop-filter: blur(5px);
  }

  .metadata-icon {
    font-size: 0.8rem;
  }

  .metadata-label {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.6);
  }

  .metadata-value {
    font-family: 'Monaco', monospace;
    font-size: 0.9rem;
    color: white;
    font-weight: 600;
  }

  /* Tab Navigation */
  .tab-nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
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

  /* Tools Container */
  .tools-container {
    flex: 1;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .tool-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    padding: 1.5rem;
    text-align: center;
  }

  .stat-card.success {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%);
    border-color: rgba(16, 185, 129, 0.2);
  }

  .stat-card.error {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.04) 100%);
    border-color: rgba(239, 68, 68, 0.2);
  }

  .stat-card.pending {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%);
    border-color: rgba(245, 158, 11, 0.2);
  }

  .stat-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: white;
    font-family: 'Monaco', monospace;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin-bottom: 1rem;
  }

  .mcp-breakdown {
    margin-bottom: 2rem;
  }

  .mcp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .mcp-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .mcp-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .mcp-name {
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    font-size: 0.85rem;
    letter-spacing: 0.05em;
  }

  .mcp-count {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .mcp-stats {
    display: flex;
    gap: 1rem;
  }

  .mcp-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .mcp-stat-value {
    font-weight: 700;
    color: white;
    font-size: 0.9rem;
  }

  .mcp-stat-value.success {
    color: #86efac;
  }

  .mcp-stat-value.error {
    color: #fca5a5;
  }

  .mcp-stat-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .tool-timeline {
    margin-top: 2rem;
  }

  .timeline-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .timeline-item {
    display: flex;
    flex-direction: column;
  }

  .timeline-trigger {
    background: linear-gradient(135deg, rgba(180, 83, 9, 0.08) 0%, rgba(180, 83, 9, 0.04) 100%);
    border: 1px solid rgba(180, 83, 9, 0.2);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    text-align: left;
    font-weight: 600;
  }

  .timeline-trigger:hover {
    background: linear-gradient(135deg, rgba(180, 83, 9, 0.12) 0%, rgba(180, 83, 9, 0.06) 100%);
    border-color: rgba(180, 83, 9, 0.3);
  }

  .timeline-turn {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.4rem;
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: #93c5fd;
    min-width: 3.5rem;
    text-align: center;
  }

  .timeline-tool-name {
    flex: 1;
    color: #fcd34d;
    font-weight: 600;
  }

  .timeline-status {
    font-size: 0.9rem;
  }

  .timeline-duration {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
    font-family: 'Monaco', monospace;
    min-width: 3.5rem;
    text-align: right;
  }

  .timeline-time {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.7rem;
    min-width: 5rem;
    text-align: right;
  }

  .timeline-details {
    margin-top: 0.4rem;
    padding: 0;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(180, 83, 9, 0.15);
    border-radius: 0 0 0.75rem 0.75rem;
    border-top: none;
    overflow: hidden;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
  }
</style>

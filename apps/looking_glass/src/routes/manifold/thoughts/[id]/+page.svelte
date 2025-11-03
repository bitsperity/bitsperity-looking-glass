<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { loadThought, saveThought, reembed, relateThoughts } from '$lib/services/manifoldService';
  import { similar, unlinkRelated } from '$lib/api/manifold';
  import TreeView from '$lib/components/manifold/TreeView.svelte';
  import VersionDiff from '$lib/components/manifold/VersionDiff.svelte';
  import NetworkCard from '$lib/components/manifold/NetworkCard.svelte';
  import TypePayloadRenderer from '$lib/components/manifold/TypePayloadRenderer.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  import SessionWorkspaceSelector from '$lib/components/manifold/SessionWorkspaceSelector.svelte';
  import Breadcrumbs from '$lib/components/manifold/Breadcrumbs.svelte';
  import { goto } from '$app/navigation';

  let id = '';
  let item: any = null;
  let loading = true; let error: string | null = null; let saving = false;
  let sim: any[] = [];
  let activeTab: 'details' | 'tree' | 'versions' | 'relations' = 'details';

  // Editable helpers
  let tickersStr = '';
  let tagsStr = '';
  let sectorsStr = '';
  let assumptionsStr = '';
  let evidenceStr = '';
  let newRelatedId = '';

  $: id = $page.params.id;

  async function load() {
    loading = true; error = null;
    try {
      item = await loadThought(id);
      const s = await similar(id, 10);
      sim = s.similar || [];
      // initialize helpers from item
      tickersStr = (item.tickers || []).join(', ');
      tagsStr = (item.tags || []).join(', ');
      sectorsStr = (item.sectors || []).join(', ');
      assumptionsStr = (item.epistemology?.assumptions || []).join('\n');
      evidenceStr = (item.epistemology?.evidence || []).join('\n');
      // ensure nested objects exist for binding
      item.epistemology = item.epistemology || { reasoning: '', assumptions: [], evidence: [] };
      if (item.epistemology.reasoning == null) item.epistemology.reasoning = '';
      if (!Array.isArray(item.epistemology.assumptions)) item.epistemology.assumptions = [];
      if (!Array.isArray(item.epistemology.evidence)) item.epistemology.evidence = [];
      item.flags = item.flags || {};
      if (item.flags.pinned == null) item.flags.pinned = false;
      if (item.flags.promoted_to_kg == null) item.flags.promoted_to_kg = false;
      item.type_payload = item.type_payload || {};
    } catch (e: any) { error = e?.message ?? 'Error'; }
    finally { loading = false; }
  }

  async function save() {
    saving = true;
    try {
      // normalize helpers back into arrays
      item.tickers = (tickersStr || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
      item.tags = (tagsStr || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
      item.sectors = (sectorsStr || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
      item.epistemology = item.epistemology || {};
      item.epistemology.assumptions = (assumptionsStr || '').split('\n').map((s:string)=>s.trim()).filter(Boolean);
      item.epistemology.evidence = (evidenceStr || '').split('\n').map((s:string)=>s.trim()).filter(Boolean);
      await saveThought({ ...item, id });
    } finally { saving = false; }
  }

  async function saveSessionWorkspace() {
    // Auto-save when session/workspace changes
    if (!saving && item) {
      try {
        await saveThought({ 
          id, 
          session_id: item.session_id || undefined,
          workspace_id: item.workspace_id || undefined
        });
      } catch (e: any) {
        console.error('Failed to save session/workspace:', e);
      }
    }
  }

  async function doReembed() {
    await reembed(id);
  }

  async function addRelation() {
    if (!newRelatedId) return;
    await relateThoughts(id, newRelatedId);
    newRelatedId = '';
    await load();
  }
  async function removeRelation(rid: string) {
    await unlinkRelated(id, rid);
    await load();
  }

  onMount(load);

  function onTypeChange(e: Event) {
    const target = e.currentTarget as HTMLSelectElement;
    const newType = target.value;
    item.type = newType;
    // initialize minimal payloads per type
    if (newType === 'hypothesis') {
      item.type_payload = item.type_payload || {};
      if (item.type_payload.decision_deadline === undefined) item.type_payload.decision_deadline = '';
      if (item.type_payload.validation_criteria === undefined) item.type_payload.validation_criteria = '';
      if (item.type_payload.risk_to_invalid === undefined) item.type_payload.risk_to_invalid = '';
      if (item.type_payload.expected_outcome === undefined) item.type_payload.expected_outcome = '';
    } else if (newType === 'decision') {
      item.type_payload = item.type_payload || {};
      if (item.type_payload.action === undefined) item.type_payload.action = 'buy';
      if (item.type_payload.instrument === undefined) item.type_payload.instrument = '';
      if (item.type_payload.size === undefined) item.type_payload.size = '';
      if (item.type_payload.price === undefined) item.type_payload.price = '';
      if (item.type_payload.rationale === undefined) item.type_payload.rationale = '';
      if (item.type_payload.risk === undefined) item.type_payload.risk = '';
    } else {
      item.type_payload = {};
    }
  }

  function colorForType(type?: string, status?: string): string {
    const colors: Record<string, string> = {
      observation: '#10b981',
      hypothesis: '#3b82f6',
      analysis: '#8b5cf6',
      decision: '#f59e0b',
      reflection: '#ec4899',
      question: '#06b6d4',
    };
    let color = colors[type || 'observation'] || '#6b7280';
    if (status === 'deleted') color = '#ef4444';
    if (status === 'quarantined') color = '#eab308';
    return color;
  }
</script>

<div class="h-full overflow-y-auto bg-neutral-950">
  <div class="max-w-7xl mx-auto px-6 py-8">
    {#if item}
      <Breadcrumbs items={[
        { label: 'Manifold', href: '/manifold/dashboard' },
        ...(item.workspace_id ? [{ label: 'Workspaces', href: '/manifold/workspaces' }, { label: item.workspace_id, href: `/manifold/workspaces/${encodeURIComponent(item.workspace_id)}` }] : []),
        ...(item.session_id ? [{ label: 'Sessions', href: '/manifold/sessions' }, { label: item.session_id, href: `/manifold/sessions/${encodeURIComponent(item.session_id)}` }] : []),
        { label: item.title || id }
      ]} />
    {/if}

    {#if loading}
      <div class="space-y-6 mt-8">
        <div class="h-12 bg-neutral-800/50 rounded-lg animate-pulse"></div>
        <div class="h-96 bg-neutral-800/50 rounded-lg animate-pulse"></div>
      </div>
    {:else if error}
      <GlassPanel error={error} title="❌ Error" />
    {:else if item}
      <!-- Header Section: Title, Type, Status Badge -->
      <div class="mt-6 mb-8">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-3">
              <div 
                class="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                style="background-color: {colorForType(item.type, item.status)}"
              ></div>
              <h1 class="text-4xl font-bold text-neutral-100 leading-tight">
                {item.title || 'Untitled Thought'}
              </h1>
            </div>
            <div class="flex items-center gap-4 text-sm text-neutral-400 ml-6">
              <span class="px-2.5 py-1 rounded-md bg-neutral-800/50 text-neutral-300 font-medium">
                {item.type || 'unknown'}
              </span>
              <span class="px-2.5 py-1 rounded-md bg-neutral-800/50 text-neutral-300">
                {item.status || 'active'}
              </span>
              {#if item.confidence_score}
                <span class="px-2.5 py-1 rounded-md bg-neutral-800/50 text-neutral-300">
                  {Math.round((item.confidence_score || 0) * 100)}% confidence
                </span>
              {/if}
            </div>
          </div>
          <div class="flex gap-2">
            <button 
              class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-50" 
              disabled={saving} 
              on:click={save}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="flex gap-1 border-b border-neutral-800 mb-8">
        <button 
          class="px-6 py-3 font-medium text-sm transition-all relative"
          class:text-indigo-400={activeTab === 'details'}
          class:text-neutral-500={activeTab !== 'details'}
          class:hover:text-neutral-300={activeTab !== 'details'}
          on:click={() => activeTab = 'details'}
        >
          Details
          {#if activeTab === 'details'}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
          {/if}
        </button>
        <button 
          class="px-6 py-3 font-medium text-sm transition-all relative"
          class:text-indigo-400={activeTab === 'tree'}
          class:text-neutral-500={activeTab !== 'tree'}
          class:hover:text-neutral-300={activeTab !== 'tree'}
          on:click={() => activeTab = 'tree'}
        >
          Tree
          {#if activeTab === 'tree'}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
          {/if}
        </button>
        <button 
          class="px-6 py-3 font-medium text-sm transition-all relative"
          class:text-indigo-400={activeTab === 'versions'}
          class:text-neutral-500={activeTab !== 'versions'}
          class:hover:text-neutral-300={activeTab !== 'versions'}
          on:click={() => activeTab = 'versions'}
        >
          Versions
          {#if activeTab === 'versions'}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
          {/if}
        </button>
        <button 
          class="px-6 py-3 font-medium text-sm transition-all relative"
          class:text-indigo-400={activeTab === 'relations'}
          class:text-neutral-500={activeTab !== 'relations'}
          class:hover:text-neutral-300={activeTab !== 'relations'}
          on:click={() => activeTab = 'relations'}
        >
          Relations
          {#if activeTab === 'relations'}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
          {/if}
        </button>
      </div>

      <!-- Tab Content -->
      {#if activeTab === 'details'}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Content Column (2/3 width) -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Core Content Card -->
            <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-6">
              <h2 class="text-lg font-semibold text-neutral-200 mb-4">Content</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Title</label>
                  <input 
                    class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                    bind:value={item.title}
                    placeholder="Enter thought title..."
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Content</label>
                  <textarea 
                    class="w-full px-4 py-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none font-mono text-sm leading-relaxed" 
                    rows="12" 
                    bind:value={item.content}
                    placeholder="Enter thought content..."
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Metadata Card -->
            <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-6">
              <h2 class="text-lg font-semibold text-neutral-200 mb-4">Metadata</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Type</label>
                  <select 
                    class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                    bind:value={item.type} 
                    on:change={onTypeChange}
                  >
                    <option value="observation">observation</option>
                    <option value="hypothesis">hypothesis</option>
                    <option value="analysis">analysis</option>
                    <option value="decision">decision</option>
                    <option value="reflection">reflection</option>
                    <option value="question">question</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Status</label>
                  <select 
                    class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                    bind:value={item.status}
                  >
                    <option value="active">active</option>
                    <option value="validated">validated</option>
                    <option value="invalidated">invalidated</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Confidence Level</label>
                  <select 
                    class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                    bind:value={item.confidence_level}
                  >
                    <option value="speculation">speculation</option>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="certain">certain</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Confidence Score</label>
                  <div class="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      bind:value={item.confidence_score} 
                      class="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                    />
                    <div class="text-sm text-neutral-300 font-mono w-12 text-right">
                      {Math.round((item.confidence_score||0)*100)}%
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Timeframe</label>
                  <input 
                    class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                    bind:value={item.timeframe}
                    placeholder="e.g., Q1 2025"
                  />
                </div>
              </div>
            </div>

            <!-- Tags & Tickers Card -->
            <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-6">
              <h2 class="text-lg font-semibold text-neutral-200 mb-4">Tags & Tickers</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Tickers</label>
                  <input 
                    class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                    bind:value={tickersStr}
                    placeholder="AAPL, MSFT, GOOGL"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Tags</label>
                  <input 
                    class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                    bind:value={tagsStr}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Sectors</label>
                  <input 
                    class="w-full px-4 py-2.5 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                    bind:value={sectorsStr}
                    placeholder="Technology, Healthcare"
                  />
                </div>
              </div>
            </div>

            <!-- Epistemology Card -->
            <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-6">
              <h2 class="text-lg font-semibold text-neutral-200 mb-4">Epistemology</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-medium text-neutral-400 mb-2">Reasoning</label>
                  <textarea 
                    class="w-full px-4 py-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none text-sm" 
                    rows="4" 
                    bind:value={item.epistemology.reasoning}
                    placeholder="Enter reasoning..."
                  ></textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-neutral-400 mb-2">Assumptions (one per line)</label>
                    <textarea 
                      class="w-full px-4 py-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none text-sm font-mono" 
                      rows="5" 
                      bind:value={assumptionsStr}
                      placeholder="Assumption 1&#10;Assumption 2"
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-neutral-400 mb-2">Evidence (one per line)</label>
                    <textarea 
                      class="w-full px-4 py-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none text-sm font-mono" 
                      rows="5" 
                      bind:value={evidenceStr}
                      placeholder="Evidence 1&#10;Evidence 2"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- Session & Workspace Card -->
            <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-6">
              <h2 class="text-lg font-semibold text-neutral-200 mb-4">Organization</h2>
              <SessionWorkspaceSelector
                sessionId={item.session_id || ''}
                workspaceId={item.workspace_id || ''}
                onSessionChange={async (id) => {
                  item.session_id = id || undefined;
                  await saveSessionWorkspace();
                }}
                onWorkspaceChange={async (id) => {
                  item.workspace_id = id || undefined;
                  await saveSessionWorkspace();
                }}
              />
              {#if item.workspace_id}
                <div class="mt-4">
                  <a 
                    href={`/manifold/workspaces/${encodeURIComponent(item.workspace_id)}`}
                    class="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    View Workspace
                  </a>
                </div>
              {/if}
            </div>
          </div>

          <!-- Sidebar Column (1/3 width) -->
          <div class="space-y-6">
            <!-- Actions Card -->
            <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-5">
              <h3 class="text-sm font-semibold text-neutral-200 mb-3">Actions</h3>
              <div class="space-y-2">
                <button 
                  class="w-full px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium transition-colors" 
                  on:click={doReembed}
                >
                  Re-embed
                </button>
                <button 
                  class="w-full px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium transition-colors"
                  on:click={() => item.flags.promoted_to_kg = !item.flags.promoted_to_kg}
                >
                  {item.flags.promoted_to_kg ? 'Unpromote' : 'Promote to KG'}
                </button>
              </div>
            </div>

            <!-- Flags Card -->
            <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-5">
              <h3 class="text-sm font-semibold text-neutral-200 mb-3">Flags</h3>
              <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer hover:text-neutral-200 transition-colors">
                  <input 
                    type="checkbox" 
                    bind:checked={item.flags.pinned}
                    class="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Pinned</span>
                </label>
                <label class="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer hover:text-neutral-200 transition-colors">
                  <input 
                    type="checkbox" 
                    bind:checked={item.flags.promoted_to_kg}
                    class="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Promoted to KG</span>
                </label>
              </div>
            </div>

            <!-- Type Payload Card -->
            {#if item.type_payload && Object.keys(item.type_payload).length > 0}
              <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-5">
                <h3 class="text-sm font-semibold text-neutral-200 mb-3">Type Payload</h3>
                <TypePayloadRenderer 
                  type={item.type} 
                  payload={item.type_payload || {}} 
                  onChange={(p) => { item.type_payload = p; }}
                />
              </div>
            {/if}

            <!-- Similar Thoughts Card -->
            {#if sim.length > 0}
              <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-5">
                <h3 class="text-sm font-semibold text-neutral-200 mb-3">Similar Thoughts</h3>
                <div class="space-y-2 max-h-[400px] overflow-y-auto">
                  {#each sim.slice(0, 5) as s}
                    <a 
                      href={`/manifold/thoughts/${s.thought_id}`}
                      class="block p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-colors group"
                    >
                      <div class="text-sm text-neutral-300 group-hover:text-neutral-100 line-clamp-2 mb-1">
                        {s.title || s.thought_id}
                      </div>
                      {#if s.similarity_score}
                        <div class="text-xs text-neutral-500">
                          {Math.round(s.similarity_score * 100)}% similar
                        </div>
                      {/if}
                    </a>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Relations Card -->
            <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-5">
              <h3 class="text-sm font-semibold text-neutral-200 mb-3">Relations</h3>
              <div class="space-y-2 mb-3">
                {#each (item.links?.related_thoughts || []) as rid}
                  <div class="flex items-center justify-between p-2 rounded-lg bg-neutral-800/50 border border-neutral-700">
                    <a 
                      href={`/manifold/thoughts/${rid}`}
                      class="text-xs text-indigo-400 hover:text-indigo-300 truncate flex-1 mr-2"
                    >
                      {rid.slice(0, 8)}...
                    </a>
                    <button 
                      class="px-2 py-1 rounded text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors" 
                      on:click={() => removeRelation(rid)}
                    >
                      Remove
                    </button>
                  </div>
                {:else}
                  <div class="text-xs text-neutral-500 text-center py-4">No relations yet</div>
                {/each}
              </div>
              <div class="flex gap-2">
                <input 
                  class="flex-1 px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 text-xs placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                  placeholder="Thought ID" 
                  bind:value={newRelatedId} 
                />
                <button 
                  class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors" 
                  on:click={addRelation}
                >
                  Add
                </button>
              </div>
            </div>

            <!-- Network Card -->
            <NetworkCard thought={item} relations={item.links?.relations || []} />
          </div>
        </div>
      {/if}
      {#if activeTab === 'tree'}
        <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-6">
          <TreeView thoughtId={id} />
        </div>
      {/if}
      {#if activeTab === 'versions'}
        <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-6">
          <VersionDiff thought={item} />
        </div>
      {/if}
      {#if activeTab === 'relations'}
        <div class="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800 p-6">
          <h2 class="text-lg font-semibold text-neutral-200 mb-4">Relations</h2>
          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-neutral-300 mb-2">Ariadne Facts</h3>
              <div class="text-xs text-neutral-400 font-mono bg-neutral-800/50 p-3 rounded-lg">
                {JSON.stringify(item.links?.ariadne_facts || [], null, 2)}
              </div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-neutral-300 mb-2">Ariadne Entities</h3>
              <div class="text-xs text-neutral-400 font-mono bg-neutral-800/50 p-3 rounded-lg">
                {JSON.stringify(item.links?.ariadne_entities || [], null, 2)}
              </div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-neutral-300 mb-2">Related Thoughts</h3>
              <div class="space-y-2">
                {#each (item.links?.related_thoughts || []) as rid}
                  <div class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700">
                    <a 
                      href={`/manifold/thoughts/${rid}`}
                      class="text-sm text-indigo-400 hover:text-indigo-300 font-mono"
                    >
                      {rid}
                    </a>
                    <button 
                      class="px-3 py-1 rounded text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors" 
                      on:click={() => removeRelation(rid)}
                    >
                      Remove
                    </button>
                  </div>
                {:else}
                  <div class="text-sm text-neutral-500 text-center py-6">No related thoughts</div>
                {/each}
              </div>
              <div class="mt-4 flex gap-2">
                <input 
                  class="flex-1 px-4 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                  placeholder="Enter thought ID" 
                  bind:value={newRelatedId} 
                />
                <button 
                  class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors" 
                  on:click={addRelation}
                >
                  Add Relation
                </button>
              </div>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

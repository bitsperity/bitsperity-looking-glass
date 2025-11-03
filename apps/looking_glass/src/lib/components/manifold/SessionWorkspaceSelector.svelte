<script lang="ts">
  import { onMount } from 'svelte';
  import { getWorkspaceSessions, getWorkspaces } from '$lib/api/manifold';

  export let sessionId: string = '';
  export let workspaceId: string = '';
  export let onSessionChange: (id: string) => void = () => {};
  export let onWorkspaceChange: (id: string) => void = () => {};

  let sessions: any[] = [];
  let workspaces: any[] = [];
  let loading = false;
  let sessionSearch = '';
  let workspaceSearch = '';
  let sessionsLoaded = false;
  let workspacesLoaded = false;

  // Load sessions only from the selected workspace
  async function loadSessions() {
    if (!workspaceId) {
      sessions = [];
      sessionsLoaded = false;
      return;
    }
    if (sessionsLoaded && workspaceId) return;
    loading = true;
    try {
      const sessionsResp = await getWorkspaceSessions(workspaceId, 50);
      sessions = sessionsResp.sessions || [];
      sessionsLoaded = true;
    } catch (e) {
      console.error('Error loading sessions:', e);
      sessions = [];
    } finally {
      loading = false;
    }
  }

  // Reset sessions when workspace changes (but don't auto-load to avoid infinite loops)
  $: if (!workspaceId) {
    sessions = [];
    sessionsLoaded = false;
    sessionId = '';
  }

  async function loadWorkspaces() {
    if (workspacesLoaded) return;
    loading = true;
    try {
      const workspacesResp = await getWorkspaces(50);
      workspaces = workspacesResp.workspaces || [];
      workspacesLoaded = true;
    } catch (e) {
      console.error('Error loading workspaces:', e);
    } finally {
      loading = false;
    }
  }

  $: filteredSessions = sessions.filter(s =>
    !sessionSearch || s.session_id.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  $: filteredWorkspaces = workspaces.filter(w =>
    !workspaceSearch || w.workspace_id.toLowerCase().includes(workspaceSearch.toLowerCase())
  );

  onMount(() => {
    // Load workspaces on mount
    loadWorkspaces();
    // If workspaceId is already set, load sessions
    if (workspaceId) {
      loadSessions();
    }
  });
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Workspace Selector (FIRST - required) -->
  <div>
    <label class="text-sm font-medium text-neutral-300 mb-2 block">
      Workspace <span class="text-amber-400">*</span>
    </label>
    {#if loading}
      <div class="text-xs text-neutral-500">Loading workspaces...</div>
    {:else}
      <div class="relative">
        <input
          type="text"
          bind:value={workspaceSearch}
          placeholder="Search or type new..."
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          on:focus={() => {
            workspaceSearch = '';
            loadWorkspaces();
          }}
        />
        {#if workspaceSearch && filteredWorkspaces.length > 0}
          <div class="absolute z-10 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded shadow-lg max-h-48 overflow-auto">
            {#each filteredWorkspaces.slice(0, 10) as workspace (workspace.workspace_id)}
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors"
                on:click={() => {
                  workspaceId = workspace.workspace_id;
                  workspaceSearch = '';
                  onWorkspaceChange(workspaceId);
                }}
              >
                {workspace.workspace_id} ({workspace.count})
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <div class="mt-2">
        <select
          bind:value={workspaceId}
          on:change={() => {
            onWorkspaceChange(workspaceId);
            // Reset sessions when workspace changes
            sessionsLoaded = false;
            sessionId = '';
            loadSessions();
          }}
          on:focus={loadWorkspaces}
          required
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Select workspace (required)</option>
          {#each workspaces.slice(0, 50) as workspace (workspace.workspace_id)}
            <option value={workspace.workspace_id}>
              {workspace.workspace_id} ({workspace.count})
            </option>
          {/each}
        </select>
      </div>
      {#if !workspaceId && workspaceSearch}
        <div class="mt-2 text-xs text-neutral-400">
          Will create new workspace: "{workspaceSearch}"
        </div>
      {:else if !workspaceId}
        <div class="mt-2 text-xs text-amber-400">
          Workspace is required
        </div>
      {/if}
    {/if}
  </div>

  <!-- Session Selector (SECOND - optional, depends on workspace) -->
  <div>
    <label class="text-sm font-medium text-neutral-300 mb-2 block">Session (optional)</label>
    {#if loading}
      <div class="text-xs text-neutral-500">Loading sessions...</div>
    {:else}
      <div class="relative">
        <input
          type="text"
          bind:value={sessionSearch}
          placeholder="Search or type new..."
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          on:focus={() => {
            sessionSearch = '';
            loadSessions();
          }}
        />
        {#if sessionSearch && filteredSessions.length > 0}
          <div class="absolute z-10 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded shadow-lg max-h-48 overflow-auto">
            {#each filteredSessions.slice(0, 10) as session (session.session_id)}
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors"
                on:click={() => {
                  sessionId = session.session_id;
                  sessionSearch = '';
                  onSessionChange(sessionId);
                }}
              >
                {session.session_id} ({session.count})
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <div class="mt-2">
        <select
          bind:value={sessionId}
          on:change={() => onSessionChange(sessionId)}
          on:focus={loadSessions}
          disabled={!workspaceId}
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">None (optional)</option>
          {#each sessions.slice(0, 50) as session (session.session_id)}
            <option value={session.session_id}>
              {session.session_id} ({session.count})
            </option>
          {/each}
        </select>
      </div>
      {#if !workspaceId}
        <div class="mt-2 text-xs text-amber-400">
          Select a workspace first to enable session selection
        </div>
      {:else if !sessionId && sessionSearch}
        <div class="mt-2 text-xs text-neutral-400">
          Will create new session: "{sessionSearch}"
        </div>
      {/if}
    {/if}
  </div>
</div>


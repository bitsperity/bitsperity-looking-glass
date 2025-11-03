<script lang="ts">
  import { onMount } from 'svelte';
  import { getSessions, getWorkspaces } from '$lib/api/manifold';

  export let sessionId: string = '';
  export let workspaceId: string = '';
  export let onSessionChange: (id: string) => void = () => {};
  export let onWorkspaceChange: (id: string) => void = () => {};

  let sessions: any[] = [];
  let workspaces: any[] = [];
  let loading = true;
  let sessionSearch = '';
  let workspaceSearch = '';

  async function load() {
    try {
      const [sessionsResp, workspacesResp] = await Promise.all([
        getSessions(1000),
        getWorkspaces(1000),
      ]);
      sessions = sessionsResp.sessions || [];
      workspaces = workspacesResp.workspaces || [];
    } catch (e) {
      console.error('Error loading sessions/workspaces:', e);
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

  onMount(load);
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Session Selector -->
  <div>
    <label class="text-sm font-medium text-neutral-300 mb-2 block">Session</label>
    {#if loading}
      <div class="text-xs text-neutral-500">Loading sessions...</div>
    {:else}
      <div class="relative">
        <input
          type="text"
          bind:value={sessionSearch}
          placeholder="Search or type new..."
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          on:focus={() => sessionSearch = ''}
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
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">None (unassigned)</option>
          {#each sessions.slice(0, 50) as session (session.session_id)}
            <option value={session.session_id}>
              {session.session_id} ({session.count})
            </option>
          {/each}
        </select>
      </div>
      {#if !sessionId && sessionSearch}
        <div class="mt-2 text-xs text-neutral-400">
          Will create new session: "{sessionSearch}"
        </div>
      {/if}
    {/if}
  </div>

  <!-- Workspace Selector -->
  <div>
    <label class="text-sm font-medium text-neutral-300 mb-2 block">Workspace</label>
    {#if loading}
      <div class="text-xs text-neutral-500">Loading workspaces...</div>
    {:else}
      <div class="relative">
        <input
          type="text"
          bind:value={workspaceSearch}
          placeholder="Search or type new..."
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          on:focus={() => workspaceSearch = ''}
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
          on:change={() => onWorkspaceChange(workspaceId)}
          class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">None (unassigned)</option>
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
      {/if}
    {/if}
  </div>
</div>


<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet } from '$lib/api/client';
  let jobId = '';
  let job: any = null; let err: string | null = null;
  async function load(){ err=null; job=null; if(!jobId) return; try{ job = await apiGet(`/v1/ingest/jobs/${jobId}`); }catch(e){err=String(e);} }
  let timer: any;
  function startPoll(){ clearInterval(timer); timer=setInterval(load, 1000); }
  onMount(()=>()=>clearInterval(timer));
</script>

<div class="space-y-4">
  <h2 class="text-xl font-semibold">Ingest Jobs</h2>
  <div class="flex space-x-2 items-end">
    <div>
      <label class="text-xs text-neutral-400">job_id</label>
      <input class="bg-neutral-800 px-2 py-1 rounded" bind:value={jobId} />
    </div>
    <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" on:click={() => { load(); startPoll(); }}>Poll</button>
  </div>
  {#if err}<div class="text-red-400 text-sm">{err}</div>{/if}
  {#if job}
    <pre class="bg-neutral-900 p-3 rounded text-xs overflow-auto">{JSON.stringify(job, null, 2)}</pre>
  {/if}
</div>


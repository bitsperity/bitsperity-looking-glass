<script lang="ts">
  import { usdToBtc, btcToUsd } from '$lib/api/convert';
  let on = new Date().toISOString().slice(0,10);
  let usd = 1000; let btc = 0.02;
  let res1: any=null; let res2: any=null; let err: string | null=null;
  async function doUsd(){ try{ res1 = await usdToBtc(usd, on); }catch(e){err=String(e);} }
  async function doBtc(){ try{ res2 = await btcToUsd(btc, on); }catch(e){err=String(e);} }
</script>

<div class="space-y-4">
  <h2 class="text-xl font-semibold">Convert USD ↔ BTC</h2>
  <div class="grid grid-cols-2 gap-4">
    <div class="p-3 bg-neutral-800 rounded space-y-2">
      <div class="text-sm text-neutral-400">USD → BTC</div>
      <input class="w-full bg-neutral-700 px-2 py-1 rounded" type="number" bind:value={usd} />
      <input class="w-full bg-neutral-700 px-2 py-1 rounded" type="date" bind:value={on} />
      <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" on:click={doUsd}>Convert</button>
      {#if res1}
        <div class="text-sm text-neutral-300">{res1.btc ?? '—'} BTC @ {res1.date}</div>
      {/if}
    </div>
    <div class="p-3 bg-neutral-800 rounded space-y-2">
      <div class="text-sm text-neutral-400">BTC → USD</div>
      <input class="w-full bg-neutral-700 px-2 py-1 rounded" type="number" step="0.00000001" bind:value={btc} />
      <input class="w-full bg-neutral-700 px-2 py-1 rounded" type="date" bind:value={on} />
      <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" on:click={doBtc}>Convert</button>
      {#if res2}
        <div class="text-sm text-neutral-300">{res2.usd ?? '—'} USD @ {res2.date}</div>
      {/if}
    </div>
  </div>
  {#if err}<div class="text-red-400 text-sm">{err}</div>{/if}
</div>


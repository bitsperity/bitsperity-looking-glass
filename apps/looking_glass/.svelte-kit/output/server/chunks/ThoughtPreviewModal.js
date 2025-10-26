import { c as create_ssr_component, e as escape, d as each, f as add_attribute } from "./ssr.js";
const MANIFOLD_BASE = "http://127.0.0.1:8083";
async function http(path, init) {
  const resp = await fetch(`${MANIFOLD_BASE}${path}`, init);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${txt}`);
  }
  return await resp.json();
}
const getThought = (id) => http(`/v1/memory/thought/${id}`);
const deleteThought = (id, soft = true) => http(`/v1/memory/thought/${id}?soft=${soft}`, { method: "DELETE" });
const search = (body) => http(`/v1/memory/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const similar = (id, k = 10) => http(`/v1/memory/similar/${id}?k=${k}`);
const css = {
  code: "body{overflow:auto}",
  map: '{"version":3,"file":"ThoughtPreviewModal.svelte","sources":["ThoughtPreviewModal.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { onMount } from \\"svelte\\";\\nimport { getThought, similar } from \\"$lib/api/manifold\\";\\nexport let thoughtId = null;\\nexport let onClose = null;\\nlet item = null;\\nlet sims = [];\\nlet loading = false;\\nasync function load() {\\n  if (!thoughtId) return;\\n  loading = true;\\n  try {\\n    item = await getThought(thoughtId);\\n    const s = await similar(thoughtId, 5);\\n    sims = s.similar || [];\\n  } finally {\\n    loading = false;\\n  }\\n}\\nfunction close() {\\n  onClose && onClose();\\n}\\nfunction onKey(e) {\\n  if (e.key === \\"Escape\\") close();\\n}\\n$: thoughtId, load();\\nonMount(() => {\\n  window.addEventListener(\\"keydown\\", onKey);\\n  return () => window.removeEventListener(\\"keydown\\", onKey);\\n});\\n<\/script>\\n\\n{#if thoughtId}\\n  <button class=\\"fixed inset-0 bg-black/60 z-50\\" aria-label=\\"Close\\" on:click={close}></button>\\n  <div role=\\"dialog\\" aria-modal=\\"true\\" class=\\"fixed right-0 top-0 h-full w-full md:w-[720px] bg-neutral-950 z-50 border-l border-neutral-800 overflow-auto\\" on:click|stopPropagation>\\n    <div class=\\"p-4 border-b border-neutral-800 flex items-center justify-between\\">\\n      <div class=\\"text-lg font-semibold\\">Thought Preview</div>\\n      <button class=\\"px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800\\" on:click={close}>Close</button>\\n    </div>\\n    <div class=\\"p-4 space-y-3\\">\\n      {#if loading}\\n        <div class=\\"text-neutral-400\\">Loading…</div>\\n      {:else if item}\\n        <div>\\n          <div class=\\"text-sm text-neutral-400\\">{item.type} · {item.status}</div>\\n          <div class=\\"text-xl font-semibold\\">{item.title}</div>\\n          {#if item.tickers?.length}\\n            <div class=\\"mt-1 flex flex-wrap gap-1\\">{#each item.tickers as t}<span class=\\"text-xs bg-neutral-800 rounded px-2 py-0.5\\">{t}</span>{/each}</div>\\n          {/if}\\n        </div>\\n        <div class=\\"text-sm whitespace-pre-wrap\\">{item.content}</div>\\n        <div class=\\"grid grid-cols-2 gap-2\\">\\n          <div class=\\"text-xs text-neutral-400\\">confidence: {Math.round((item.confidence_score||0)*100)}%</div>\\n          <div class=\\"text-xs text-neutral-400\\">timeframe: {item.timeframe || \'-\'}</div>\\n        </div>\\n        {#if item.tags?.length}\\n          <div>\\n            <div class=\\"text-xs text-neutral-500 mb-1\\">Tags</div>\\n            <div class=\\"flex gap-1 flex-wrap\\">{#each item.tags as tg}<span class=\\"text-xs bg-neutral-800 rounded px-2 py-0.5\\">{tg}</span>{/each}</div>\\n          </div>\\n        {/if}\\n        {#if sims.length}\\n          <div>\\n            <div class=\\"text-xs text-neutral-500 mb-1\\">Similar</div>\\n            <div class=\\"space-y-1\\">\\n              {#each sims as s}\\n                <div class=\\"flex items-center justify-between text-sm\\">\\n                  <div class=\\"truncate\\">{s.title}</div>\\n                  <a class=\\"px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800\\" href={`/manifold/thoughts/${s.thought_id}`}>Open</a>\\n                </div>\\n              {/each}\\n            </div>\\n          </div>\\n        {/if}\\n        <div class=\\"flex gap-2\\">\\n          <a class=\\"px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800\\" href={`/manifold/thoughts/${thoughtId}`}>Open full</a>\\n          <a class=\\"px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800\\" href={`/manifold/relations/${thoughtId}`}>Relations</a>\\n          <a class=\\"px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800\\" href={`/manifold/promote/${thoughtId}`}>Promote</a>\\n        </div>\\n      {/if}\\n    </div>\\n  </div>\\n{/if}\\n\\n<style>\\n  :global(body) { overflow: auto; }\\n</style>\\n\\n\\n"],"names":[],"mappings":"AAoFU,IAAM,CAAE,QAAQ,CAAE,IAAM"}'
};
const ThoughtPreviewModal = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { thoughtId = null } = $$props;
  let { onClose = null } = $$props;
  let item = null;
  let sims = [];
  let loading = false;
  async function load() {
    if (!thoughtId) return;
    loading = true;
    try {
      item = await getThought(thoughtId);
      const s = await similar(thoughtId, 5);
      sims = s.similar || [];
    } finally {
      loading = false;
    }
  }
  if ($$props.thoughtId === void 0 && $$bindings.thoughtId && thoughtId !== void 0) $$bindings.thoughtId(thoughtId);
  if ($$props.onClose === void 0 && $$bindings.onClose && onClose !== void 0) $$bindings.onClose(onClose);
  $$result.css.add(css);
  {
    load();
  }
  return `${thoughtId ? `<button class="fixed inset-0 bg-black/60 z-50" aria-label="Close"></button> <div role="dialog" aria-modal="true" class="fixed right-0 top-0 h-full w-full md:w-[720px] bg-neutral-950 z-50 border-l border-neutral-800 overflow-auto"><div class="p-4 border-b border-neutral-800 flex items-center justify-between"><div class="text-lg font-semibold" data-svelte-h="svelte-1fybab4">Thought Preview</div> <button class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800" data-svelte-h="svelte-1a0qbip">Close</button></div> <div class="p-4 space-y-3">${loading ? `<div class="text-neutral-400" data-svelte-h="svelte-186sx6p">Loading…</div>` : `${item ? `<div><div class="text-sm text-neutral-400">${escape(item.type)} · ${escape(item.status)}</div> <div class="text-xl font-semibold">${escape(item.title)}</div> ${item.tickers?.length ? `<div class="mt-1 flex flex-wrap gap-1">${each(item.tickers, (t) => {
    return `<span class="text-xs bg-neutral-800 rounded px-2 py-0.5">${escape(t)}</span>`;
  })}</div>` : ``}</div> <div class="text-sm whitespace-pre-wrap">${escape(item.content)}</div> <div class="grid grid-cols-2 gap-2"><div class="text-xs text-neutral-400">confidence: ${escape(Math.round((item.confidence_score || 0) * 100))}%</div> <div class="text-xs text-neutral-400">timeframe: ${escape(item.timeframe || "-")}</div></div> ${item.tags?.length ? `<div><div class="text-xs text-neutral-500 mb-1" data-svelte-h="svelte-shx6o7">Tags</div> <div class="flex gap-1 flex-wrap">${each(item.tags, (tg) => {
    return `<span class="text-xs bg-neutral-800 rounded px-2 py-0.5">${escape(tg)}</span>`;
  })}</div></div>` : ``} ${sims.length ? `<div><div class="text-xs text-neutral-500 mb-1" data-svelte-h="svelte-1wo6ciz">Similar</div> <div class="space-y-1">${each(sims, (s) => {
    return `<div class="flex items-center justify-between text-sm"><div class="truncate">${escape(s.title)}</div> <a class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800"${add_attribute("href", `/manifold/thoughts/${s.thought_id}`, 0)}>Open</a> </div>`;
  })}</div></div>` : ``} <div class="flex gap-2"><a class="px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800"${add_attribute("href", `/manifold/thoughts/${thoughtId}`, 0)}>Open full</a> <a class="px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800"${add_attribute("href", `/manifold/relations/${thoughtId}`, 0)}>Relations</a> <a class="px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800"${add_attribute("href", `/manifold/promote/${thoughtId}`, 0)}>Promote</a></div>` : ``}`}</div></div>` : ``}`;
});
export {
  ThoughtPreviewModal as T,
  deleteThought as d,
  search as s
};

import { c as create_ssr_component, v as validate_component, d as add_attribute, f as each, e as escape } from "../../../../chunks/ssr.js";
import { T as ThoughtCard } from "../../../../chunks/ThoughtCard.js";
import { M as ManifoldNav } from "../../../../chunks/ManifoldNav.js";
import { T as ThoughtPreviewModal } from "../../../../chunks/ThoughtPreviewModal.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let q = "";
  let results = [];
  let facets = {};
  let facetSuggest = {};
  let activeFilters = [];
  let selected = {};
  let miniBuckets = [];
  let previewId = null;
  return `<div class="p-6 space-y-4 h-full overflow-auto"><h1 class="text-2xl font-semibold" data-svelte-h="svelte-1h5zxaj">Manifold · Search</h1> ${validate_component(ManifoldNav, "ManifoldNav").$$render($$result, {}, {}, {})} <div class="flex gap-2"><input class="px-3 py-2 rounded bg-neutral-800 w-full" placeholder="Search thoughts… (type to search, Enter to force)"${add_attribute("value", q, 0)}> <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" data-svelte-h="svelte-1jymclq">Search</button></div> ${activeFilters.length > 0 ? `<div class="flex flex-wrap gap-2 text-xs">${each(activeFilters, (f, i) => {
    return `<span class="px-2 py-1 bg-neutral-800 rounded">${escape(f.key)}:${escape(f.value)} <button class="ml-1 text-neutral-400 hover:text-neutral-200" data-svelte-h="svelte-1rwucbr">×</button> </span>`;
  })} <button class="px-2 py-1 bg-neutral-900 rounded hover:bg-neutral-800" data-svelte-h="svelte-17q25ij">Clear all</button></div>` : ``} <div class="grid grid-cols-1 md:grid-cols-4 gap-4"><aside class="md:col-span-1 space-y-3"><div class="text-sm text-neutral-400" data-svelte-h="svelte-xf9gnl">Facets</div> ${each(Object.entries(facets), ([k, items]) => {
    return `<div><div class="text-xs text-neutral-500 uppercase mb-1">${escape(k)}</div> <div class="flex flex-wrap gap-1">${each(items, (it) => {
      return `<button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded text-xs">${escape(it.value)} (${escape(it.count)})</button>`;
    })}</div> </div>`;
  })} ${Object.keys(facetSuggest).length > 0 ? `<div><div class="text-xs text-neutral-500 uppercase mb-1" data-svelte-h="svelte-11fzwsr">Suggestions</div> ${each(Object.entries(facetSuggest), ([k, items]) => {
    return `<div class="mb-1"><div class="text-[11px] text-neutral-500">${escape(k)}</div> <div class="flex flex-wrap gap-1">${each((items || []).slice(0, 6), (it) => {
      return `<button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded text-xs">${escape(it.value)} (${escape(it.count)})</button>`;
    })}</div> </div>`;
  })}</div>` : ``} <div><div class="text-xs text-neutral-500 uppercase mb-1" data-svelte-h="svelte-62kje9">Timeline (last 14d)</div> <div class="flex items-end gap-1 h-16">${each(miniBuckets, (b) => {
    return `<div class="w-2 bg-neutral-700"${add_attribute("style", `height:${Math.max(2, Math.min(60, b.count * 4))}px`, 0)}${add_attribute("title", `${b.date}: ${b.count}`, 0)}></div>`;
  })}</div></div></aside> <section class="md:col-span-3"><div class="mb-2 flex items-center gap-2 text-xs"><label class="flex items-center gap-1"><input type="checkbox"> Select all</label> <button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded" data-svelte-h="svelte-11hnsat">Quarantine</button> <button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded" data-svelte-h="svelte-e0di29">Unquarantine</button> <button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded" data-svelte-h="svelte-xjtx3w">Re-embed</button> <button class="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded" data-svelte-h="svelte-13w3rsu">Mark Promoted</button></div> ${`${`<div class="text-sm text-neutral-400 mb-2">${escape(results.length)} results</div> <div class="space-y-2">${each(results, (r) => {
    return `<div class="bg-neutral-900 rounded p-4 border border-neutral-800"><div class="flex items-start gap-3"><input type="checkbox" ${!!selected[r.id] ? "checked" : ""}> <div class="flex-1">${validate_component(ThoughtCard, "ThoughtCard").$$render(
      $$result,
      {
        thought: r.thought,
        showActions: true,
        onPreview: (id) => {
          previewId = id;
        }
      },
      {},
      {}
    )} </div></div> <div class="mt-2 flex items-center justify-between text-xs"><div class="text-neutral-500 flex items-center gap-3"><span>Score: ${escape(r.score.toFixed(3))}</span> ${r.score_components ? `<span class="text-neutral-600">base ${escape(r.score_components.base_sim.toFixed(2))} · rec ${escape(r.score_components.recency.toFixed(2))} · type ${escape(r.score_components.type.toFixed(2))} · tic ${escape(r.score_components.ticker.toFixed(2))} </span>` : ``}</div> <div class="flex gap-2"><a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"${add_attribute("href", `/manifold/thoughts/${r.id}`, 0)}>Open</a> <a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"${add_attribute("href", `/manifold/relations/${r.id}`, 0)}>Relations</a> <a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"${add_attribute("href", `/manifold/thoughts/${r.id}`, 0)}>Similar</a> </div></div> </div>`;
  })}</div>`}`}</section></div> ${validate_component(ThoughtPreviewModal, "ThoughtPreviewModal").$$render(
    $$result,
    {
      thoughtId: previewId,
      onClose: () => {
        previewId = null;
      }
    },
    {},
    {}
  )}</div>`;
});
export {
  Page as default
};

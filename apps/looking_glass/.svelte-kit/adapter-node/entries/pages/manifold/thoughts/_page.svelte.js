import { c as create_ssr_component, v as validate_component, f as add_attribute, e as escape, d as each } from "../../../../chunks/ssr.js";
import { d as deleteThought, T as ThoughtPreviewModal, s as search } from "../../../../chunks/ThoughtPreviewModal.js";
import { T as ThoughtCard } from "../../../../chunks/ThoughtCard.js";
import { M as ManifoldNav } from "../../../../chunks/ManifoldNav.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
function goto(url, opts = {}) {
  {
    throw new Error("Cannot call goto(...) on the server");
  }
}
async function softDeleteThought(id) {
  return deleteThought(id, true);
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let items = [];
  let loading = false;
  let error = null;
  let form = {
    title: "",
    timeframe: "",
    confidence_score: 0.5
  };
  let tickersInput = "";
  let tagsInput = "";
  let sectorsInput = "";
  async function load() {
    loading = true;
    error = null;
    try {
      const resp = await search({ query: "", limit: 100 });
      items = (resp.results || []).map((r) => r.thought);
    } catch (e) {
      error = e?.message ?? "Error";
    } finally {
      loading = false;
    }
  }
  async function remove(id) {
    if (!confirm("Delete this thought?")) return;
    await softDeleteThought(id);
    await load();
  }
  function openThought(id) {
    goto();
  }
  let previewId = null;
  return `<div class="p-6 space-y-4 h-full overflow-auto"><h1 class="text-2xl font-semibold" data-svelte-h="svelte-1sk3pkd">Manifold · Thoughts</h1> ${validate_component(ManifoldNav, "ManifoldNav").$$render($$result, {}, {}, {})} <div class="bg-neutral-900 rounded p-4 border border-neutral-800"><div class="text-sm text-neutral-400 mb-2" data-svelte-h="svelte-1lz14i8">Create Thought</div> <div class="grid grid-cols-1 md:grid-cols-2 gap-2"><select class="px-3 py-2 rounded bg-neutral-800"><option value="observation" data-svelte-h="svelte-xyciny">observation</option><option value="hypothesis" data-svelte-h="svelte-nubhuu">hypothesis</option><option value="analysis" data-svelte-h="svelte-13078km">analysis</option><option value="decision" data-svelte-h="svelte-1gdc7aa">decision</option><option value="reflection" data-svelte-h="svelte-lsbeau">reflection</option><option value="question" data-svelte-h="svelte-qzewim">question</option></select> <select class="px-3 py-2 rounded bg-neutral-800"><option value="active" data-svelte-h="svelte-iz5znm">active</option><option value="validated" data-svelte-h="svelte-1mzca26">validated</option><option value="invalidated" data-svelte-h="svelte-bl1lr4">invalidated</option><option value="archived" data-svelte-h="svelte-1i8cjp2">archived</option></select> <input class="px-3 py-2 rounded bg-neutral-800" placeholder="Title"${add_attribute("value", form.title, 0)}> <textarea class="px-3 py-2 rounded bg-neutral-800 md:col-span-2" rows="4" placeholder="Content">${escape("")}</textarea> <input class="px-3 py-2 rounded bg-neutral-800" placeholder="Tickers (comma)"${add_attribute("value", tickersInput, 0)}> <input class="px-3 py-2 rounded bg-neutral-800" placeholder="Tags (comma)"${add_attribute("value", tagsInput, 0)}> <input class="px-3 py-2 rounded bg-neutral-800" placeholder="Sectors (comma)"${add_attribute("value", sectorsInput, 0)}> <input class="px-3 py-2 rounded bg-neutral-800" placeholder="Timeframe (e.g. Q1-2025)"${add_attribute("value", form.timeframe, 0)}> <div class="flex items-center gap-2"><div class="text-xs text-neutral-400" data-svelte-h="svelte-1f3jszy">Confidence</div> <input type="range" min="0" max="1" step="0.01" class="w-full"${add_attribute("value", form.confidence_score, 0)}> <div class="text-xs text-neutral-300 w-10 text-right">${escape(Math.round(form.confidence_score * 100))}%</div></div></div> <button class="mt-3 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" data-svelte-h="svelte-p0pplg">Create</button></div> ${loading ? `<div class="text-neutral-400" data-svelte-h="svelte-186sx6p">Loading…</div>` : `${error ? `<div class="text-red-400">${escape(error)}</div>` : `<div class="text-sm text-neutral-400 mb-2">${escape(items.length)} thoughts</div> <div class="space-y-2">${each(items, (it) => {
    return `${validate_component(ThoughtCard, "ThoughtCard").$$render(
      $$result,
      {
        thought: it,
        onOpen: openThought,
        onDelete: remove,
        onPreview: (id) => {
          previewId = id;
        }
      },
      {},
      {}
    )}`;
  })}</div>`}`}</div> ${validate_component(ThoughtPreviewModal, "ThoughtPreviewModal").$$render(
    $$result,
    {
      thoughtId: previewId,
      onClose: () => {
        previewId = null;
      }
    },
    {},
    {}
  )}`;
});
export {
  Page as default
};

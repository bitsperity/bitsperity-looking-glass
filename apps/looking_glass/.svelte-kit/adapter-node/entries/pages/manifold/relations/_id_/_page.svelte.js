import { c as create_ssr_component, a as subscribe, e as escape, d as add_attribute, b as each, v as validate_component } from "../../../../../chunks/ssr.js";
import { p as page } from "../../../../../chunks/stores.js";
import { T as ThoughtPreviewModal } from "../../../../../chunks/ThoughtPreviewModal.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let id = "";
  let relatedId = "";
  let relationWeight = 1;
  let suggest = [];
  let previewId = null;
  id = $page.params.id;
  $$unsubscribe_page();
  return `<div class="p-6 space-y-4 h-full overflow-auto"><h1 class="text-2xl font-semibold">Relations · ${escape(id)}</h1> <div class="bg-neutral-900 rounded p-4 border border-neutral-800"><div class="text-sm text-neutral-400" data-svelte-h="svelte-1mdso84">Add relation</div> <div class="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2"><input class="px-3 py-2 rounded bg-neutral-800" placeholder="related_id"${add_attribute("value", relatedId, 0)}> <select class="px-3 py-2 rounded bg-neutral-800"><option value="related" data-svelte-h="svelte-2i58nk">related</option><option value="supports" data-svelte-h="svelte-v3opxa">supports</option><option value="contradicts" data-svelte-h="svelte-gu0g4u">contradicts</option><option value="followup" data-svelte-h="svelte-wcikom">followup</option><option value="duplicate" data-svelte-h="svelte-112btdo">duplicate</option></select> <input type="number" min="0" max="1" step="0.1" class="px-3 py-2 rounded bg-neutral-800" placeholder="weight"${add_attribute("value", relationWeight, 0)}> <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" data-svelte-h="svelte-x46xm4">Link</button></div> ${suggest.length > 0 ? `<div class="mt-3 text-xs text-neutral-400" data-svelte-h="svelte-1ee2hlk">Suggestions</div> <div class="mt-1 flex flex-wrap gap-2">${each(suggest, (s) => {
    return `<button class="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs">+ ${escape(s.title)}</button>`;
  })}</div>` : ``}</div> ${`${`${``}`}`}</div> ${validate_component(ThoughtPreviewModal, "ThoughtPreviewModal").$$render(
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

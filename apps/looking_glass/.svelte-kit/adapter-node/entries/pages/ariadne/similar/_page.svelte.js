import { c as create_ssr_component, v as validate_component, f as add_attribute } from "../../../../chunks/ssr.js";
import { A as AutocompleteInput, a as fetchTickerSuggestions } from "../../../../chunks/ariadneSuggestions.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let ticker = "";
  let limit = 10;
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<div class="max-w-7xl mx-auto p-6"><h1 class="text-3xl font-bold text-neutral-100 mb-6" data-svelte-h="svelte-16h210a">Similar Entities</h1> <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3"><div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-zuim69">Ticker</label> ${validate_component(AutocompleteInput, "AutocompleteInput").$$render(
      $$result,
      {
        fetchSuggestions: fetchTickerSuggestions,
        placeholder: "e.g., NVDA",
        value: ticker
      },
      {
        value: ($$value) => {
          ticker = $$value;
          $$settled = false;
        }
      },
      {}
    )}</div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-14znm5s">Method</label> <select class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"><option value="weighted_jaccard" data-svelte-h="svelte-1tr3g1n">Weighted Jaccard</option><option value="gds" data-svelte-h="svelte-1pwlczj">GDS Node Similarity</option></select></div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-1ninenc">Limit</label> <input type="number" min="1" max="50" class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", limit, 0)}></div></div> <button class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white mb-6" data-svelte-h="svelte-k6o2jt">Find Similar</button> ${`${`${``}`}`}</div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};

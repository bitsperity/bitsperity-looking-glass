import { c as create_ssr_component, v as validate_component, d as add_attribute } from "../../../../chunks/ssr.js";
import { A as AutocompleteInput, b as fetchEventNameSuggestions } from "../../../../chunks/ariadneSuggestions.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let eventQuery = "";
  let k = 10;
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<div class="max-w-7xl mx-auto p-6"><h1 class="text-3xl font-bold text-neutral-100 mb-6" data-svelte-h="svelte-16jdm3g">Impact Analysis</h1> <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3"><div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-gs5uib">Event Query</label> ${validate_component(AutocompleteInput, "AutocompleteInput").$$render(
      $$result,
      {
        fetchSuggestions: fetchEventNameSuggestions,
        placeholder: "e.g., Export, Rate Hike, or select from existing events",
        value: eventQuery
      },
      {
        value: ($$value) => {
          eventQuery = $$value;
          $$settled = false;
        }
      },
      {}
    )}</div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-okx3y8">Top K Entities</label> <input type="number" min="1" max="50" class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", k, 0)}></div></div> <button class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white mb-6" data-svelte-h="svelte-b40c51">Analyze Impact</button> ${`${`${``}`}`}</div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};

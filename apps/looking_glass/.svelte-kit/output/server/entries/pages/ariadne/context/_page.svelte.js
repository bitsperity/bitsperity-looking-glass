import { c as create_ssr_component, v as validate_component, d as add_attribute, e as escape } from "../../../../chunks/ssr.js";
import { A as AutocompleteInput, f as fetchTopicSuggestions, a as fetchTickerSuggestions } from "../../../../chunks/ariadneSuggestions.js";
const ssr = false;
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let topic = "";
  let tickersInput = "";
  let asOf = "";
  let depth = 2;
  let limit = 100;
  let containerEl;
  let nodes = [];
  let edges = [];
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<div class="flex flex-col h-screen bg-neutral-950 text-neutral-100"><div class="p-4 border-b border-neutral-800"><h1 class="text-2xl font-bold mb-3" data-svelte-h="svelte-xp9abm">Context Graph</h1>  <div class="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">${validate_component(AutocompleteInput, "AutocompleteInput").$$render(
      $$result,
      {
        fetchSuggestions: fetchTopicSuggestions,
        placeholder: "Topic",
        value: topic
      },
      {
        value: ($$value) => {
          topic = $$value;
          $$settled = false;
        }
      },
      {}
    )} ${validate_component(AutocompleteInput, "AutocompleteInput").$$render(
      $$result,
      {
        fetchSuggestions: fetchTickerSuggestions,
        placeholder: "Tickers (comma-sep)",
        value: tickersInput
      },
      {
        value: ($$value) => {
          tickersInput = $$value;
          $$settled = false;
        }
      },
      {}
    )} <input type="datetime-local" placeholder="As of (ISO)" class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"${add_attribute("value", asOf, 0)}> <input type="number" min="1" max="3" placeholder="Depth" class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"${add_attribute("value", depth, 0)}> <input type="number" min="10" max="500" placeholder="Limit" class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"${add_attribute("value", limit, 0)}></div> <button ${""} class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-50">${escape("Load Context")}</button> ${``}</div> <div class="flex-1 relative"><div class="absolute inset-0"${add_attribute("this", containerEl, 0)}></div>  <div class="absolute top-4 right-4 bg-neutral-900/90 rounded border border-neutral-800 p-3 max-w-xs" data-svelte-h="svelte-1af8b3t"><div class="text-xs font-semibold text-neutral-300 mb-2">Interactions</div> <div class="text-xs text-neutral-400 space-y-1"><div>• Click: Select node</div> <div>• Double-click: Open detail</div> <div>• Hover edge: Show relation info</div></div></div>  ${``}  ${``}</div> <div class="p-2 border-t border-neutral-800 text-xs text-neutral-500 text-center">${escape(nodes.length)} nodes | ${escape(edges.length)} edges</div></div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default,
  ssr
};

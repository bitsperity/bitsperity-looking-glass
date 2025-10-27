import { c as create_ssr_component, e as escape, v as validate_component, d as add_attribute, b as each } from "../../../../chunks/ssr.js";
import { C as ConfidenceBadge } from "../../../../chunks/ConfidenceBadge.js";
import { A as AutocompleteInput, c as fetchPatternCategorySuggestions } from "../../../../chunks/ariadneSuggestions.js";
const PatternCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { pattern } = $$props;
  if ($$props.pattern === void 0 && $$bindings.pattern && pattern !== void 0) $$bindings.pattern(pattern);
  return `<div class="bg-neutral-900 rounded border border-neutral-800 p-4 hover:border-neutral-700 transition-colors"><div class="flex items-start justify-between mb-2"><span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-pink-800 text-pink-100">${escape(pattern.category)}</span> ${validate_component(ConfidenceBadge, "ConfidenceBadge").$$render($$result, { confidence: pattern.confidence }, {}, {})}</div> <h3 class="text-lg font-medium text-neutral-100 mb-1">${escape(pattern.name)}</h3> ${pattern.description ? `<p class="text-sm text-neutral-400 mb-2">${escape(pattern.description)}</p>` : ``} <div class="flex items-center gap-4 text-xs text-neutral-500 mt-2"><div>Occurrences: ${escape(pattern.occurrences)}</div> ${pattern.success_rate != null ? `<div>Success: ${escape(Math.round(pattern.success_rate * 100))}%</div>` : ``} ${pattern.validated_by ? `<div>By: ${escape(pattern.validated_by)}</div>` : ``}</div></div>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let category = "";
  let minConfidence = 0.7;
  let minOccurrences = 1;
  let patterns = [];
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<div class="max-w-7xl mx-auto p-6"><h1 class="text-3xl font-bold text-neutral-100 mb-6" data-svelte-h="svelte-1uksc1d">Validated Patterns</h1>  <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3"><div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-pssnvn">Category</label> ${validate_component(AutocompleteInput, "AutocompleteInput").$$render(
      $$result,
      {
        fetchSuggestions: fetchPatternCategorySuggestions,
        placeholder: "e.g., technical, fundamental, supply_chain",
        value: category
      },
      {
        value: ($$value) => {
          category = $$value;
          $$settled = false;
        }
      },
      {}
    )}</div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-j7mzmj">Min Confidence</label> <input type="number" min="0" max="1" step="0.1" class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", minConfidence, 0)}></div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-11qix4d">Min Occurrences</label> <input type="number" min="1" class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", minOccurrences, 0)}></div></div> <button class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white mb-6" data-svelte-h="svelte-qmbkkq">Apply Filters</button> ${`${`${patterns.length > 0 ? `<div class="mb-4 text-sm text-neutral-400">Found ${escape(patterns.length)} patterns</div> <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${each(patterns, (pattern) => {
      return `<a href="${"/ariadne/patterns/" + escape(pattern.id, true)}">${validate_component(PatternCard, "PatternCard").$$render($$result, { pattern }, {}, {})} </a>`;
    })}</div>` : `<div class="text-neutral-400" data-svelte-h="svelte-5eukmv">No patterns found</div>`}`}`}</div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};

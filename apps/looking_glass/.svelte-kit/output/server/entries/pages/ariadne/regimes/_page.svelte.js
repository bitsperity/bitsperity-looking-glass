import { c as create_ssr_component, e as escape, v as validate_component, f as each, d as add_attribute } from "../../../../chunks/ssr.js";
import { C as ConfidenceBadge } from "../../../../chunks/ConfidenceBadge.js";
const RegimeCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { regime } = $$props;
  if ($$props.regime === void 0 && $$bindings.regime && regime !== void 0) $$bindings.regime(regime);
  return `<div class="bg-neutral-900 rounded border border-neutral-800 p-4"><div class="flex items-start justify-between mb-2"><span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-teal-800 text-teal-100">${escape(regime.type)}</span> ${validate_component(ConfidenceBadge, "ConfidenceBadge").$$render($$result, { confidence: regime.confidence }, {}, {})}</div> <h3 class="text-lg font-medium text-neutral-100 mb-1">${escape(regime.name)}</h3> <div class="flex flex-wrap gap-1 mt-2">${each(regime.characteristics, (char) => {
    return `<span class="text-xs bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">${escape(char)}</span>`;
  })}</div> <div class="text-xs text-neutral-500 mt-2">${escape(new Date(regime.start_date).toLocaleDateString())} ${regime.end_date ? `- ${escape(new Date(regime.end_date).toLocaleDateString())}` : `- Present`}</div> ${regime.similarity_score != null ? `<div class="text-xs text-neutral-600 mt-1">Similarity: ${escape(Math.round(regime.similarity_score * 100))}%</div>` : ``}</div>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let currentRegimes = [];
  let similarRegimes = [];
  let characteristicsInput = "";
  let similarLimit = 5;
  return `<div class="max-w-7xl mx-auto p-6"><h1 class="text-3xl font-bold text-neutral-100 mb-6" data-svelte-h="svelte-z2ouri">Market Regimes</h1>  <div class="mb-8"><h2 class="text-xl font-semibold text-neutral-200 mb-3" data-svelte-h="svelte-sbdip4">Current Regimes</h2> ${`${currentRegimes.length === 0 ? `<div class="text-neutral-400" data-svelte-h="svelte-1mwsibd">No current regimes found</div>` : `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${each(currentRegimes, (regime) => {
    return `${validate_component(RegimeCard, "RegimeCard").$$render($$result, { regime }, {}, {})}`;
  })}</div>`}`}</div>  <div><h2 class="text-xl font-semibold text-neutral-200 mb-3" data-svelte-h="svelte-w1bvax">Find Similar Historical Regimes</h2> <div class="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3"><div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-4ohmcp">Characteristics (comma-separated)</label> <input type="text" placeholder="e.g., high_vol, bear, rate_uncertainty" class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", characteristicsInput, 0)}></div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-1ninenc">Limit</label> <input type="number" min="1" max="20" class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", similarLimit, 0)}></div></div> <button class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white mb-6" data-svelte-h="svelte-mgm66z">Search Similar</button> ${similarRegimes.length > 0 ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${each(similarRegimes, (regime) => {
    return `${validate_component(RegimeCard, "RegimeCard").$$render($$result, { regime }, {}, {})}`;
  })}</div>` : ``}</div></div>`;
});
export {
  Page as default
};

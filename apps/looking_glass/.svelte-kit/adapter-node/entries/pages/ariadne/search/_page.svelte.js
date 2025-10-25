import { c as create_ssr_component, e as escape, g as createEventDispatcher, v as validate_component, b as subscribe, d as add_attribute, f as each } from "../../../../chunks/ssr.js";
import { p as page } from "../../../../chunks/stores.js";
import { A as AutocompleteInput, f as fetchTopicSuggestions } from "../../../../chunks/ariadneSuggestions.js";
const LabelBadge = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { label } = $$props;
  const colors = {
    Company: "bg-blue-800 text-blue-100",
    Instrument: "bg-cyan-800 text-cyan-100",
    Event: "bg-red-800 text-red-100",
    Concept: "bg-purple-800 text-purple-100",
    Location: "bg-green-800 text-green-100",
    Observation: "bg-yellow-800 text-yellow-100",
    PriceEvent: "bg-orange-800 text-orange-100",
    Pattern: "bg-pink-800 text-pink-100",
    Hypothesis: "bg-indigo-800 text-indigo-100",
    Regime: "bg-teal-800 text-teal-100",
    News: "bg-gray-800 text-gray-100"
  };
  const colorClass = colors[label] || "bg-neutral-700 text-neutral-200";
  if ($$props.label === void 0 && $$bindings.label && label !== void 0) $$bindings.label(label);
  return `<span class="${"inline-block px-2 py-0.5 rounded text-xs font-medium " + escape(colorClass, true)}">${escape(label)}</span>`;
});
const NodeCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { node } = $$props;
  createEventDispatcher();
  const displayName = node.properties.name || node.properties.ticker || node.properties.title || node.properties.pattern_name || node.properties.regime_name || node.properties.statement || node.properties.content || node.properties.symbol || node.id;
  if ($$props.node === void 0 && $$bindings.node && node !== void 0) $$bindings.node(node);
  return `<div class="bg-neutral-900 rounded border border-neutral-800 p-4 hover:border-neutral-700 transition-colors"><div class="flex items-start justify-between mb-2">${validate_component(LabelBadge, "LabelBadge").$$render($$result, { label: node.label }, {}, {})} <div class="flex gap-1"><button class="px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200" data-svelte-h="svelte-aepct4">Preview</button> <button class="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white" data-svelte-h="svelte-1ezr1qr">Open</button></div></div> <h3 class="text-lg font-medium text-neutral-100 mb-1">${escape(displayName)}</h3> ${node.properties.sector ? `<div class="text-sm text-neutral-400">Sector: ${escape(node.properties.sector)}</div>` : ``} ${node.properties.ticker ? `<div class="text-xs text-neutral-500 mt-1">Ticker: ${escape(node.properties.ticker)}</div>` : ``} ${node.properties.occurred_at ? `<div class="text-xs text-neutral-500 mt-1">Occurred: ${escape(new Date(node.properties.occurred_at).toLocaleDateString())}</div>` : ``} ${node.properties.category ? `<div class="text-sm text-neutral-400">Category: ${escape(node.properties.category)}</div>` : ``} ${node.properties.description ? `<div class="text-xs text-neutral-500 mt-1 line-clamp-2">${escape(node.properties.description)}</div>` : ``} ${node.properties.confidence !== void 0 ? `<div class="text-xs text-neutral-500 mt-1">Confidence: ${escape((node.properties.confidence * 100).toFixed(0))}%</div>` : ``}</div>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let topic = "";
  let tickersInput = "";
  let depth = 2;
  let limit = 100;
  let nodes = [];
  let facets = {
    label: /* @__PURE__ */ new Set(),
    sector: /* @__PURE__ */ new Set()
  };
  let tickerSuggestions = [];
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    {
      {
        const q = $page.url.searchParams.get("q");
        const t = $page.url.searchParams.get("tickers");
        if (q) topic = q;
        if (t) tickersInput = t;
      }
    }
    $$rendered = `<div class="max-w-7xl mx-auto p-6"><h1 class="text-3xl font-bold text-neutral-100 mb-6" data-svelte-h="svelte-ugzq92">Search Knowledge Graph</h1>  <div class="mb-6 space-y-3"><div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-kbicoe">Topic <span class="text-neutral-500 text-xs">(start typing for suggestions)</span></label> ${validate_component(AutocompleteInput, "AutocompleteInput").$$render(
      $$result,
      {
        fetchSuggestions: fetchTopicSuggestions,
        placeholder: "e.g., technology, semiconductors, AI...",
        value: topic
      },
      {
        value: ($$value) => {
          topic = $$value;
          $$settled = false;
        }
      },
      {}
    )}</div> <div class="grid grid-cols-1 md:grid-cols-3 gap-3"><div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-t3ix1n">Tickers <span class="text-neutral-500 text-xs">(comma-separated, or pick from dropdown)</span></label> ${validate_component(AutocompleteInput, "AutocompleteInput").$$render(
      $$result,
      {
        suggestions: tickerSuggestions,
        placeholder: "e.g., NVDA, AMD, INTC...",
        value: tickersInput
      },
      {
        value: ($$value) => {
          tickersInput = $$value;
          $$settled = false;
        }
      },
      {}
    )}</div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-syzpqy">Depth</label> <input type="number" min="1" max="3" class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", depth, 0)}></div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-1ninenc">Limit</label> <input type="number" min="10" max="500" class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", limit, 0)}></div></div></div> ${`${`${nodes.length > 0 ? ` <div class="mb-4 flex gap-4 text-sm text-neutral-400"><div><strong data-svelte-h="svelte-1phuunb">Labels:</strong> ${escape(Array.from(facets.label).join(", "))}</div> ${facets.sector.size > 0 ? `<div><strong data-svelte-h="svelte-1tg13cf">Sectors:</strong> ${escape(Array.from(facets.sector).join(", "))}</div>` : ``}</div>  <div class="mb-4 text-sm text-neutral-400">Found ${escape(nodes.length)} nodes</div> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${each(nodes, (node) => {
      return `${validate_component(NodeCard, "NodeCard").$$render($$result, { node }, {}, {})}`;
    })}</div>` : `${topic || tickersInput ? `<div class="text-neutral-400" data-svelte-h="svelte-13065ku">No results found</div>` : ``}`}`}`}</div>  ${``}`;
  } while (!$$settled);
  $$unsubscribe_page();
  return $$rendered;
});
export {
  Page as default
};

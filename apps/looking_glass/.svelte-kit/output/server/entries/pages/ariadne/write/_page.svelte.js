import { c as create_ssr_component, d as add_attribute, e as escape } from "../../../../chunks/ssr.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let fact = {
    source_label: "Company",
    source_id: "",
    target_label: "Company",
    target_id: "",
    rel_type: "SUPPLIES_TO",
    valid_from: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString().slice(0, 16),
    confidence: 0.9
  };
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<div class="max-w-4xl mx-auto p-6"><h1 class="text-3xl font-bold text-neutral-100 mb-6" data-svelte-h="svelte-1vvgp16">Write to Knowledge Graph</h1>  <div class="flex gap-2 mb-6 border-b border-neutral-800"><button class="${"px-4 py-2 " + escape(
      "border-b-2 border-indigo-500 text-indigo-400",
      true
    )}">Fact</button> <button class="${"px-4 py-2 " + escape(
      "text-neutral-400",
      true
    )}">Observation</button> <button class="${"px-4 py-2 " + escape(
      "text-neutral-400",
      true
    )}">Hypothesis</button></div> ${``} ${``}  ${`<form class="space-y-4"><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-q8m1u">Source Label</label> <input type="text" required class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", fact.source_label, 0)}></div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-1usunux">Source ID (elementId)</label> <input type="text" required class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", fact.source_id, 0)}></div></div> <div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-ai4osy">Target Label</label> <input type="text" required class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", fact.target_label, 0)}></div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-1jv1a6t">Target ID (elementId)</label> <input type="text" required class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", fact.target_id, 0)}></div></div> <div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-xbx44r">Relation Type</label> <input type="text" required class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", fact.rel_type, 0)}></div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-1h36knn">Confidence</label> <input type="number" min="0" max="1" step="0.1" required class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", fact.confidence, 0)}></div></div> <div><label class="block text-sm font-medium text-neutral-300 mb-1" data-svelte-h="svelte-1xuyoel">Valid From</label> <input type="datetime-local" required class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"${add_attribute("value", fact.valid_from, 0)}></div> <button type="submit" ${""} class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">${escape("Create Fact")}</button></form>`}  ${``}  ${``}</div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};

import { c as create_ssr_component, e as escape, f as add_attribute } from "../../../../chunks/ssr.js";
const ssr = false;
function colorForLabel(label) {
  const colors = {
    Company: "#3b82f6",
    Instrument: "#06b6d4",
    Event: "#ef4444",
    Concept: "#a855f7",
    Location: "#10b981",
    Observation: "#f59e0b",
    PriceEvent: "#f97316",
    Pattern: "#ec4899",
    Hypothesis: "#6366f1",
    Regime: "#14b8a6",
    News: "#6b7280"
  };
  return colors[label] || "#9ca3af";
}
function colorForRelType(relType) {
  const colors = {
    SUPPLIES_TO: "#3b82f6",
    COMPETES_WITH: "#ef4444",
    AFFECTS: "#f97316",
    CORRELATES_WITH: "#a855f7",
    CORRELATED_WITH: "#a855f7",
    MENTIONS: "#6b7280",
    EVIDENCE_FOR: "#10b981",
    CONTRADICTS: "#7f1d1d",
    VALIDATES: "#14b8a6",
    EXTRACTED_FROM: "#ec4899",
    HAS_PRICE_EVENT: "#f59e0b",
    PRICE_EVENT_OF: "#f59e0b",
    SAME_COMMUNITY: "#06b6d4",
    BENEFITS_FROM: "#6366f1"
  };
  return colors[relType] || "#9ca3af";
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let containerEl;
  let minConfidence = 0;
  let asOf = "";
  let nodes = [];
  let edges = [];
  let selectedNodes = /* @__PURE__ */ new Set();
  let frozenNodes = /* @__PURE__ */ new Set();
  let searchQuery = "";
  return `<div class="flex flex-col h-screen bg-neutral-950 text-neutral-100"> <div class="p-4 border-b border-neutral-800"><div class="flex items-center justify-between mb-3"><h1 class="text-2xl font-bold" data-svelte-h="svelte-1uanjfx">Knowledge Graph Explorer</h1> <div class="flex gap-2"><button ${""} class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-50">${escape("Reload")}</button> <button class="${"px-3 py-1 rounded " + escape("bg-neutral-700", true) + " hover:bg-purple-500 text-white text-sm"}">Communities</button></div></div>  <div class="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3"><select class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"><option value="" data-svelte-h="svelte-1ifpj3g">All Labels</option><option value="Company" data-svelte-h="svelte-1rl31jc">Company</option><option value="Event" data-svelte-h="svelte-1s5y2ku">Event</option><option value="Concept" data-svelte-h="svelte-1okzvgu">Concept</option><option value="Pattern" data-svelte-h="svelte-12pzxse">Pattern</option><option value="Hypothesis" data-svelte-h="svelte-1ados6e">Hypothesis</option></select> <select class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"><option value="" data-svelte-h="svelte-fyo7yq">All Relations</option><option value="SUPPLIES_TO" data-svelte-h="svelte-rmafas">SUPPLIES_TO</option><option value="COMPETES_WITH" data-svelte-h="svelte-1l905i4">COMPETES_WITH</option><option value="CORRELATES_WITH" data-svelte-h="svelte-1r6fk4w">CORRELATES_WITH</option><option value="AFFECTS" data-svelte-h="svelte-15fqki6">AFFECTS</option></select> <input type="number" min="0" max="1" step="0.1" placeholder="Min Confidence" class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"${add_attribute("value", minConfidence, 0)}> <input type="datetime-local" placeholder="As of (ISO)" class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"${add_attribute("value", asOf, 0)}></div>  <div class="flex gap-2"><input type="text" placeholder="Search nodes (name, ticker)..." class="flex-1 px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"${add_attribute("value", searchQuery, 0)}> ${``}</div> ${``}</div>  <div class="flex-1 relative"><div class="absolute inset-0"${add_attribute("this", containerEl, 0)}></div>  ${selectedNodes.size > 0 ? `<div class="absolute top-4 left-4 bg-neutral-900/95 rounded border border-neutral-800 p-3 max-w-xs"><div class="text-sm font-semibold text-neutral-300 mb-2">Selected: ${escape(selectedNodes.size)}</div> <div class="flex flex-col gap-1"><button class="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs" data-svelte-h="svelte-14wihz2">Expand Neighbors (All)</button> <button class="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs" data-svelte-h="svelte-xm0jbv">Expand SUPPLIES_TO</button> <button class="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-white text-xs">${escape(frozenNodes.size > 0 ? "Unfreeze" : "Freeze")} Selection</button> <button class="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs" data-svelte-h="svelte-159nsp6">Find Paths</button> <button class="px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white text-xs" data-svelte-h="svelte-1amcglb">Clear Selection</button></div></div>` : ``}  ${``}  ${``}  ${``}  <div class="absolute bottom-4 right-4 space-y-3"> <div class="bg-neutral-900/90 rounded border border-neutral-800 p-3 max-w-xs" data-svelte-h="svelte-i2ixf1"><div class="text-xs font-semibold text-neutral-300 mb-2">Interactions</div> <div class="text-xs text-neutral-400 space-y-1"><div>• Click: Select/Deselect</div> <div>• Double-click: Open Timeline</div> <div>• Hover edge: Show info</div></div></div>  <div class="bg-neutral-900/90 rounded border border-neutral-800 p-3 max-w-xs"><div class="text-xs font-semibold text-neutral-300 mb-2" data-svelte-h="svelte-1ukwadx">Relations</div> <div class="space-y-1.5"><div class="flex items-center gap-2 text-xs"><div class="w-6 h-0.5 rounded" style="${"background: " + escape(colorForRelType("SUPPLIES_TO"), true)}"></div> <span class="text-neutral-400" data-svelte-h="svelte-1xm5b3k">SUPPLIES_TO</span></div> <div class="flex items-center gap-2 text-xs"><div class="w-6 h-0.5 rounded" style="${"background: " + escape(colorForRelType("COMPETES_WITH"), true)}"></div> <span class="text-neutral-400" data-svelte-h="svelte-83j4iq">COMPETES_WITH</span></div> <div class="flex items-center gap-2 text-xs"><div class="w-6 h-0.5 rounded" style="${"background: " + escape(colorForRelType("CORRELATES_WITH"), true)}"></div> <span class="text-neutral-400" data-svelte-h="svelte-1iwdkk2">CORRELATES_WITH</span></div> <div class="flex items-center gap-2 text-xs"><div class="w-6 h-0.5 rounded" style="${"background: " + escape(colorForRelType("AFFECTS"), true)}"></div> <span class="text-neutral-400" data-svelte-h="svelte-er3w33">AFFECTS</span></div> <div class="flex items-center gap-2 text-xs"><div class="w-6 h-0.5 rounded" style="${"background: " + escape(colorForRelType("BENEFITS_FROM"), true)}"></div> <span class="text-neutral-400" data-svelte-h="svelte-i4rxng">BENEFITS_FROM</span></div></div></div>  <div class="bg-neutral-900/90 rounded border border-neutral-800 p-3 max-w-xs"><div class="text-xs font-semibold text-neutral-300 mb-2" data-svelte-h="svelte-tnc7d">Node Types</div> <div class="space-y-1.5"><div class="flex items-center gap-2 text-xs"><div class="w-3 h-3 rounded-full" style="${"background: " + escape(colorForLabel("Company"), true)}"></div> <span class="text-neutral-400" data-svelte-h="svelte-7qdblm">Company</span></div> <div class="flex items-center gap-2 text-xs"><div class="w-3 h-3 rounded-full" style="${"background: " + escape(colorForLabel("Event"), true)}"></div> <span class="text-neutral-400" data-svelte-h="svelte-suan8l">Event</span></div> <div class="flex items-center gap-2 text-xs"><div class="w-3 h-3 rounded-full" style="${"background: " + escape(colorForLabel("Hypothesis"), true)}"></div> <span class="text-neutral-400" data-svelte-h="svelte-1mr703v">Hypothesis</span></div> <div class="flex items-center gap-2 text-xs"><div class="w-3 h-3 rounded-full" style="${"background: " + escape(colorForLabel("Observation"), true)}"></div> <span class="text-neutral-400" data-svelte-h="svelte-1jew6f">Observation</span></div></div></div></div></div>  <div class="p-2 border-t border-neutral-800 text-xs text-neutral-500 text-center">${escape(nodes.length)} nodes | ${escape(edges.length)} edges | ${escape(selectedNodes.size)} selected | ${escape(frozenNodes.size)} frozen</div></div>`;
});
export {
  Page as default,
  ssr
};

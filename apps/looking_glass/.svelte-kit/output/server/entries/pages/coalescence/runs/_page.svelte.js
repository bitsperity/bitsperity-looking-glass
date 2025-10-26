import { c as create_ssr_component, f as add_attribute, d as each, e as escape } from "../../../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let runs = [];
  let searchQuery = "";
  function applyFilters() {
    runs.filter((run) => {
      const matchesSearch = run.id.includes(searchQuery) || run.agent.includes(searchQuery);
      return matchesSearch;
    });
  }
  {
    {
      applyFilters();
    }
  }
  return `<div class="flex-1 overflow-auto px-8 pb-8"> <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 mb-8 shadow-lg"><div class="flex items-center gap-3 mb-4" data-svelte-h="svelte-wj301t"><span class="text-2xl">🔍</span> <h3 class="text-lg font-bold text-white">Filter &amp; Suche</h3></div> <div class="grid grid-cols-4 gap-4"><input type="text" placeholder="🔍 Run ID oder Agent suchen..." class="px-4 py-3 bg-neutral-900/70 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-neutral-500"${add_attribute("value", searchQuery, 0)}> <select class="px-4 py-3 bg-neutral-900/70 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"><option value="" data-svelte-h="svelte-wfc26a">🤖 Alle Agents</option>${each(["discovery", "analyst_tech", "validator"], (agent) => {
    return `<option${add_attribute("value", agent, 0)}>${escape(agent)}</option>`;
  })}</select> <select class="px-4 py-3 bg-neutral-900/70 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"><option value="" data-svelte-h="svelte-581gen">📊 Alle Status</option><option value="success" data-svelte-h="svelte-z3t2ip">✅ Success</option><option value="error" data-svelte-h="svelte-17ta3c2">❌ Error</option><option value="running" data-svelte-h="svelte-1lkn4t4">⚙️ Running</option></select> <select class="px-4 py-3 bg-neutral-900/70 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"><option${add_attribute("value", 1, 0)} data-svelte-h="svelte-1smim1h">📅 Letzte 24h</option><option${add_attribute("value", 7, 0)} data-svelte-h="svelte-b2qifj">📅 Letzte 7 Tage</option><option${add_attribute("value", 30, 0)} data-svelte-h="svelte-yhotnz">📅 Letzte 30 Tage</option></select></div></div> ${`<div class="flex items-center justify-center h-96" data-svelte-h="svelte-12pb8rd"><div class="text-center"><div class="inline-block animate-spin text-5xl mb-4">⚙️</div> <div class="text-xl text-neutral-400 font-medium">Runs werden geladen...</div></div></div>`}</div>`;
});
export {
  Page as default
};

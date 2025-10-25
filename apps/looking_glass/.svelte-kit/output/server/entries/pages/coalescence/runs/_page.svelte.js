import { c as create_ssr_component, d as add_attribute, f as each, e as escape } from "../../../../chunks/ssr.js";
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
  return `<div class="flex-1 overflow-auto px-6 pb-6"> <div class="bg-neutral-800 border border-neutral-700 rounded p-4 mb-6"><div class="grid grid-cols-4 gap-4"><input type="text" placeholder="Search run ID or agent..." class="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"${add_attribute("value", searchQuery, 0)}> <select class="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"><option value="" data-svelte-h="svelte-17dbxsv">All Agents</option>${each(["discovery", "analyst_tech", "validator"], (agent) => {
    return `<option${add_attribute("value", agent, 0)}>${escape(agent)}</option>`;
  })}</select> <select class="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"><option value="" data-svelte-h="svelte-6joivz">All Status</option><option value="success" data-svelte-h="svelte-5ng9yw">Success</option><option value="error" data-svelte-h="svelte-82vi7i">Error</option><option value="running" data-svelte-h="svelte-zt8f5c">Running</option></select> <select class="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"><option${add_attribute("value", 1, 0)} data-svelte-h="svelte-wr1rzr">Last 24h</option><option${add_attribute("value", 7, 0)} data-svelte-h="svelte-12vykyh">Last 7 days</option><option${add_attribute("value", 30, 0)} data-svelte-h="svelte-rt445">Last 30 days</option></select></div></div> ${`<div class="flex items-center justify-center h-64 text-neutral-400" data-svelte-h="svelte-crmkre"><div>Loading runs...</div></div>`}</div>`;
});
export {
  Page as default
};

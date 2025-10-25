import { c as create_ssr_component, d as add_attribute } from "../../../../chunks/ssr.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="flex-1 overflow-auto px-6 pb-6"> <div class="flex items-center justify-between mb-6"><h1 class="text-2xl font-bold" data-svelte-h="svelte-yd6lqf">Cost Analytics</h1> <div class="flex items-center gap-2"><select class="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"><option${add_attribute("value", 1, 0)} data-svelte-h="svelte-wr1rzr">Last 24h</option><option${add_attribute("value", 7, 0)} data-svelte-h="svelte-12vykyh">Last 7 days</option><option${add_attribute("value", 30, 0)} data-svelte-h="svelte-rt445">Last 30 days</option></select> <button class="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm transition-colors" data-svelte-h="svelte-1btzqgz">🔄 Refresh</button></div></div> ${`<div class="flex items-center justify-center h-64 text-neutral-400" data-svelte-h="svelte-tvi5p7"><div>Loading cost data...</div></div>`}</div>`;
});
export {
  Page as default
};

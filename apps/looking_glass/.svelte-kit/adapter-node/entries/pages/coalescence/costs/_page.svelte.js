import { c as create_ssr_component, d as add_attribute } from "../../../../chunks/ssr.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="flex-1 overflow-auto px-8 pb-8"> <div class="flex items-center justify-between mb-8"><div data-svelte-h="svelte-d4bnsc"><h1 class="text-3xl font-bold text-white flex items-center gap-3 mb-2"><span class="text-4xl">💰</span>
        Cost Analytics</h1> <p class="text-neutral-400">Detaillierte Kostenübersicht und Analyse</p></div> <div class="flex items-center gap-3"><select class="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"><option${add_attribute("value", 1, 0)} data-svelte-h="svelte-1smim1h">📅 Letzte 24h</option><option${add_attribute("value", 7, 0)} data-svelte-h="svelte-b2qifj">📅 Letzte 7 Tage</option><option${add_attribute("value", 30, 0)} data-svelte-h="svelte-yhotnz">📅 Letzte 30 Tage</option></select> <button class="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2" data-svelte-h="svelte-5csmn"><span>🔄</span>
        Aktualisieren</button></div></div> ${`<div class="flex items-center justify-center h-96" data-svelte-h="svelte-zh2p4o"><div class="text-center"><div class="inline-block animate-spin text-5xl mb-4">💰</div> <div class="text-xl text-neutral-400 font-medium">Kostendaten werden geladen...</div></div></div>`}</div>`;
});
export {
  Page as default
};

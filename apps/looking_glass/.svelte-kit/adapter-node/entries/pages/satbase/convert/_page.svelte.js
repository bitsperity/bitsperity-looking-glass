import { c as create_ssr_component, f as add_attribute } from "../../../../chunks/ssr.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let on = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  let usd = 1e3;
  let btc = 0.02;
  return `<div class="space-y-4"><h2 class="text-xl font-semibold" data-svelte-h="svelte-454hga">Convert USD ↔ BTC</h2> <div class="grid grid-cols-2 gap-4"><div class="p-3 bg-neutral-800 rounded space-y-2"><div class="text-sm text-neutral-400" data-svelte-h="svelte-zzfcl4">USD → BTC</div> <input class="w-full bg-neutral-700 px-2 py-1 rounded" type="number"${add_attribute("value", usd, 0)}> <input class="w-full bg-neutral-700 px-2 py-1 rounded" type="date"${add_attribute("value", on, 0)}> <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" data-svelte-h="svelte-3jl1ey">Convert</button> ${``}</div> <div class="p-3 bg-neutral-800 rounded space-y-2"><div class="text-sm text-neutral-400" data-svelte-h="svelte-1tbf91w">BTC → USD</div> <input class="w-full bg-neutral-700 px-2 py-1 rounded" type="number" step="0.00000001"${add_attribute("value", btc, 0)}> <input class="w-full bg-neutral-700 px-2 py-1 rounded" type="date"${add_attribute("value", on, 0)}> <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" data-svelte-h="svelte-1mcq2xb">Convert</button> ${``}</div></div> ${``}</div>`;
});
export {
  Page as default
};

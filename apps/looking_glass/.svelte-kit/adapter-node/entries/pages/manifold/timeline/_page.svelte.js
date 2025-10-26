import { c as create_ssr_component, v as validate_component, f as add_attribute } from "../../../../chunks/ssr.js";
import { M as ManifoldNav } from "../../../../chunks/ManifoldNav.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let type = "";
  let tickers = "";
  let from_dt = "";
  let to_dt = "";
  return `<div class="p-6 space-y-4 h-full overflow-auto"><h1 class="text-2xl font-semibold" data-svelte-h="svelte-1uv052w">Manifold · Timeline</h1> ${validate_component(ManifoldNav, "ManifoldNav").$$render($$result, {}, {}, {})} <div class="grid grid-cols-1 md:grid-cols-4 gap-2"><input class="px-3 py-2 rounded bg-neutral-800" placeholder="type (optional)"${add_attribute("value", type, 0)}> <input class="px-3 py-2 rounded bg-neutral-800" placeholder="tickers (comma)"${add_attribute("value", tickers, 0)}> <input class="px-3 py-2 rounded bg-neutral-800" placeholder="from_dt (ISO)"${add_attribute("value", from_dt, 0)}> <input class="px-3 py-2 rounded bg-neutral-800" placeholder="to_dt (ISO)"${add_attribute("value", to_dt, 0)}></div> <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" data-svelte-h="svelte-ym1rsn">Apply</button> ${`${`${``}`}`}</div>`;
});
export {
  Page as default
};

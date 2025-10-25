import { c as create_ssr_component, v as validate_component } from "../../../../chunks/ssr.js";
import { M as ManifoldNav } from "../../../../chunks/ManifoldNav.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="p-6 space-y-6 h-full overflow-auto"><h1 class="text-2xl font-semibold" data-svelte-h="svelte-5fp8n5">Manifold · Dashboard</h1> ${validate_component(ManifoldNav, "ManifoldNav").$$render($$result, {}, {}, {})} ${`<div class="text-neutral-400" data-svelte-h="svelte-186sx6p">Loading…</div>`}</div>`;
});
export {
  Page as default
};

import { c as create_ssr_component } from "../../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="flex-1 overflow-auto px-6 pb-6">${``} ${`<div class="flex items-center justify-center h-64 text-neutral-400" data-svelte-h="svelte-sy9d6u"><div>Loading dashboard...</div></div>`}</div>`;
});
export {
  Page as default
};

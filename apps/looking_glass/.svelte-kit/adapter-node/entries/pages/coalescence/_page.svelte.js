import { c as create_ssr_component } from "../../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="flex-1 overflow-auto px-8 pb-8">${``} ${`<div class="flex items-center justify-center h-96" data-svelte-h="svelte-c9h5f4"><div class="text-center"><div class="inline-block animate-spin text-5xl mb-4">⚙️</div> <div class="text-xl text-neutral-400 font-medium">Dashboard wird geladen...</div></div></div>`}</div>`;
});
export {
  Page as default
};

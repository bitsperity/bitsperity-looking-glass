import { c as create_ssr_component } from "../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="flex items-center justify-center h-screen" data-svelte-h="svelte-1maoqrk"><div class="text-center"><h1 class="text-4xl font-bold mb-4">LookingGlass</h1> <p class="text-neutral-400">Redirecting to Satbase...</p></div></div>`;
});
export {
  Page as default
};

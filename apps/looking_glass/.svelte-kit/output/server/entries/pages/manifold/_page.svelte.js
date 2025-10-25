import { c as create_ssr_component } from "../../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="p-6 text-neutral-400" data-svelte-h="svelte-1s1tnls">Redirecting…</div>`;
});
export {
  Page as default
};

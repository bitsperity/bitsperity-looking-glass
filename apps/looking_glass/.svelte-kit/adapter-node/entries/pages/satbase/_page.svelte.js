import { c as create_ssr_component } from "../../../chunks/ssr.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="space-y-4" data-svelte-h="svelte-ugznr9"><h1 class="text-2xl font-semibold">Satbase</h1> <div class="grid grid-cols-2 gap-4"><a href="/satbase/news" class="p-4 bg-neutral-800 rounded hover:bg-neutral-700">News</a> <a href="/satbase/prices" class="p-4 bg-neutral-800 rounded hover:bg-neutral-700">Prices</a> <a href="/satbase/macro" class="p-4 bg-neutral-800 rounded hover:bg-neutral-700">Macro</a> <a href="/satbase/convert" class="p-4 bg-neutral-800 rounded hover:bg-neutral-700">Convert</a> <a href="/satbase/watchlist" class="p-4 bg-neutral-800 rounded hover:bg-neutral-700">Watchlist/Topics</a> <a href="/satbase/jobs" class="p-4 bg-neutral-800 rounded hover:bg-neutral-700">Jobs</a></div></div>`;
});
export {
  Page as default
};

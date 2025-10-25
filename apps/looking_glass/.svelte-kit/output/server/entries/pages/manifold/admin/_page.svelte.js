import { c as create_ssr_component, v as validate_component, d as add_attribute, f as each, e as escape } from "../../../../chunks/ssr.js";
import { M as ManifoldNav } from "../../../../chunks/ManifoldNav.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let trash = [];
  let qId = "";
  return `<div class="p-6 space-y-6 h-full overflow-auto"><h1 class="text-2xl font-semibold" data-svelte-h="svelte-1hljq1o">Manifold · Admin</h1> ${validate_component(ManifoldNav, "ManifoldNav").$$render($$result, {}, {}, {})} <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="bg-neutral-900 rounded p-4 border border-neutral-800"><div class="text-sm text-neutral-400" data-svelte-h="svelte-yj8d7a">Reindex (Dry-Run)</div> <button class="mt-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" data-svelte-h="svelte-1yw1nc9">Run</button> ${``}</div> <div class="bg-neutral-900 rounded p-4 border border-neutral-800"><div class="text-sm text-neutral-400" data-svelte-h="svelte-10ppmcl">Dedupe (Stub)</div> <button class="mt-2 px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700" data-svelte-h="svelte-cd0b7u">Run</button> ${``}</div></div> <div class="bg-neutral-900 rounded p-4 border border-neutral-800"><div class="text-sm text-neutral-400" data-svelte-h="svelte-16vejgp">Quarantine</div> <div class="flex gap-2 mt-2"><input class="px-3 py-2 rounded bg-neutral-800" placeholder="thought_id"${add_attribute("value", qId, 0)}> <button class="px-3 py-2 rounded bg-yellow-700 hover:bg-yellow-600" data-svelte-h="svelte-1bcoeec">Quarantine</button> <button class="px-3 py-2 rounded bg-green-700 hover:bg-green-600" data-svelte-h="svelte-1rj5vdm">Unquarantine</button></div></div> <div class="bg-neutral-900 rounded p-4 border border-neutral-800"><div class="text-sm text-neutral-400" data-svelte-h="svelte-iexwq1">Trash</div> <button class="mt-2 px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700" data-svelte-h="svelte-nshtug">Refresh</button> <div class="space-y-2 mt-2">${each(trash, (it) => {
    return `<div class="flex items-center justify-between text-sm bg-neutral-800 rounded p-2"><div class="truncate">${escape(it.title)}</div> <button class="px-2 py-1 rounded bg-green-700 hover:bg-green-600" data-svelte-h="svelte-1atayxr">Restore</button> </div>`;
  })}</div></div></div>`;
});
export {
  Page as default
};

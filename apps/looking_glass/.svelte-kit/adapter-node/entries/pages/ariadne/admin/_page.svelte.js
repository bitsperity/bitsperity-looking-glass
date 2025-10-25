import { c as create_ssr_component, d as add_attribute, e as escape } from "../../../../chunks/ssr.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let orphansDryRun = true;
  let resetConfirm = false;
  return `<div class="max-w-7xl mx-auto p-6"><h1 class="text-3xl font-bold text-neutral-100 mb-6" data-svelte-h="svelte-1cfdpvk">Admin Tools</h1>  ${`${``}`}  <div class="bg-red-950/20 rounded border border-red-800/50 p-6 mb-8"><h2 class="text-xl font-semibold text-red-400 mb-4" data-svelte-h="svelte-1k9bq7d">⚠️ Danger Zone: Reset Graph</h2> <p class="text-sm text-neutral-400 mb-4" data-svelte-h="svelte-1i8obx8">Permanently delete ALL data in the knowledge graph. This action cannot be undone!</p> <div class="flex items-center gap-3 mb-4"><label class="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" class="rounded bg-neutral-950 border-red-700"${add_attribute("checked", resetConfirm, 1)}>
        I understand this will delete ALL data permanently</label></div> <button ${"disabled"} class="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed font-semibold">${escape("🗑️ DELETE ALL DATA")}</button> ${``}</div>  <div class="bg-neutral-900 rounded border border-neutral-800 p-6"><h2 class="text-xl font-semibold text-neutral-200 mb-4" data-svelte-h="svelte-k3jfkk">Orphaned Nodes Cleanup</h2> <p class="text-sm text-neutral-400 mb-4" data-svelte-h="svelte-1sc1pkm">Find and optionally delete nodes with no edges (isolated entities).</p> <div class="flex items-center gap-3 mb-4"><label class="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" class="rounded bg-neutral-950 border-neutral-700"${add_attribute("checked", orphansDryRun, 1)}>
        Dry Run (just preview, don&#39;t delete)</label></div> <button ${""} class="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50">${escape("Run Cleanup")}</button> ${``}</div></div>`;
});
export {
  Page as default
};

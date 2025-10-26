import { c as create_ssr_component, g as createEventDispatcher, v as validate_component, e as escape, f as add_attribute, d as each, o as onDestroy } from "../../../chunks/ssr.js";
import { C as Card } from "../../../chunks/Card.js";
import { B as Badge } from "../../../chunks/Badge.js";
import { B as Button } from "../../../chunks/Button.js";
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = /* @__PURE__ */ new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 6e4);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}
const NewsCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { item } = $$props;
  createEventDispatcher();
  if ($$props.item === void 0 && $$bindings.item && item !== void 0) $$bindings.item(item);
  return `${validate_component(Card, "Card").$$render($$result, { padding: "p-0", hover: true }, {}, {
    default: () => {
      return `<div class="p-5 cursor-pointer"> <div class="flex items-start justify-between gap-3 mb-3"><div class="flex items-center gap-2 text-xs text-neutral-400">${validate_component(Badge, "Badge").$$render($$result, { variant: "secondary" }, {}, {
        default: () => {
          return `${escape(item.source)}`;
        }
      })} <span data-svelte-h="svelte-7hh8jk">•</span> <span class="font-mono">${escape(extractDomain(item.url))}</span> <span data-svelte-h="svelte-7hh8jk">•</span> <time>${escape(formatDate(item.published_at))}</time></div> <button ${""} class="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-50" title="Delete article">${`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`}</button></div>  <a${add_attribute("href", item.url, 0)} target="_blank" rel="noopener noreferrer" class="block group"><h3 class="text-lg font-semibold text-neutral-100 mb-2 leading-snug group-hover:text-blue-400 transition-colors">${escape(item.title)} <svg class="inline-block w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></h3></a>  ${item.text ? `<p class="text-sm text-neutral-400 leading-relaxed line-clamp-2 mb-3">${escape(item.text)}</p>` : ``}  ${item.content_text || item.content_html ? `<div class="mt-3 pt-3 border-t border-neutral-700/50">${` <p class="text-sm text-neutral-300 leading-relaxed line-clamp-3">${escape(item.content_text || "Content available")}</p> <button class="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1" data-svelte-h="svelte-1ixvjqv"><span>Read full article</span> <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>`}</div>` : ``}  ${item.tickers && item.tickers.length > 0 ? `<div class="flex flex-wrap gap-1.5 mt-4">${each(item.tickers, (ticker) => {
        return `${validate_component(Badge, "Badge").$$render($$result, { variant: "primary", size: "sm" }, {}, {
          default: () => {
            return `${escape(ticker)}`;
          }
        })}`;
      })}</div>` : ``}</div>`;
    }
  })}`;
});
const css = {
  code: "@keyframes svelte-8gd0xg-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}.animate-slide-in.svelte-8gd0xg{animation:svelte-8gd0xg-slide-in 0.3s ease-out}",
  map: `{"version":3,"file":"AdminSidebar.svelte","sources":["AdminSidebar.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { createEventDispatcher } from \\"svelte\\";\\nimport Button from \\"../shared/Button.svelte\\";\\nimport Badge from \\"../shared/Badge.svelte\\";\\nexport let open = false;\\nexport let embedStatus = null;\\nexport let collections = null;\\nexport let activeAlias = \\"news_embeddings\\";\\nconst dispatch = createEventDispatcher();\\nlet batchFrom = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);\\nlet batchTo = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);\\nlet showBatchModal = false;\\nlet showSwitchModal = false;\\nlet showDeleteModal = false;\\nlet targetCollection = \\"\\";\\nfunction handleBatchStart() {\\n  dispatch(\\"batchStart\\", { from: batchFrom, to: batchTo });\\n  showBatchModal = false;\\n}\\nfunction handleCollectionSwitch() {\\n  dispatch(\\"collectionSwitch\\", { name: targetCollection });\\n  showSwitchModal = false;\\n}\\nfunction handleCollectionDelete() {\\n  dispatch(\\"collectionDelete\\", { name: targetCollection });\\n  showDeleteModal = false;\\n}\\nfunction isActiveCollection(colName) {\\n  return colName === activeAlias;\\n}\\n<\/script>\\n\\n{#if open}\\n  <!-- Backdrop -->\\n  <div \\n    class=\\"fixed inset-0 bg-black/40 z-40 transition-opacity duration-300\\"\\n    on:click={() => { open = false; }}\\n  ></div>\\n\\n  <!-- Sidebar -->\\n  <div class=\\"fixed right-0 top-0 h-full w-96 bg-neutral-900 border-l border-neutral-800 shadow-2xl z-50 overflow-y-auto animate-slide-in\\">\\n    <div class=\\"p-6 space-y-6\\">\\n      <!-- Header -->\\n      <div class=\\"flex items-center justify-between\\">\\n        <h2 class=\\"text-lg font-semibold text-neutral-100\\">Admin Panel</h2>\\n        <button \\n          class=\\"text-neutral-400 hover:text-neutral-200 text-2xl leading-none\\"\\n          on:click={() => { open = false; }}\\n        >\\n          ×\\n        </button>\\n      </div>\\n\\n      <!-- Vector Store Status -->\\n      <div class=\\"space-y-3\\">\\n        <h3 class=\\"text-sm font-medium text-neutral-300\\">Vector Store</h3>\\n        <div class=\\"bg-neutral-800/50 rounded-lg p-4 space-y-2 border border-neutral-700/50\\">\\n          {#if embedStatus}\\n            <div class=\\"flex justify-between text-xs\\">\\n              <span class=\\"text-neutral-400\\">Collection</span>\\n              <span class=\\"text-neutral-200 font-mono\\">{activeAlias}</span>\\n            </div>\\n            <div class=\\"flex justify-between text-xs\\">\\n              <span class=\\"text-neutral-400\\">Vectors</span>\\n              <span class=\\"text-neutral-200 font-mono\\">{embedStatus.vector_count?.toLocaleString() ?? 0}</span>\\n            </div>\\n            <div class=\\"flex justify-between text-xs\\">\\n              <span class=\\"text-neutral-400\\">Dimensions</span>\\n              <span class=\\"text-neutral-200 font-mono\\">{embedStatus.vector_size ?? 1024}D</span>\\n            </div>\\n          {:else}\\n            <div class=\\"text-xs text-neutral-500\\">Loading status...</div>\\n          {/if}\\n        </div>\\n      </div>\\n\\n      <!-- Embedding Status -->\\n      <div class=\\"space-y-3\\">\\n        <div class=\\"flex items-center justify-between\\">\\n          <h3 class=\\"text-sm font-medium text-neutral-300\\">Embedding Status</h3>\\n          <button \\n            class=\\"text-xs text-blue-400 hover:text-blue-300\\"\\n            on:click={() => dispatch('refreshStatus')}\\n          >\\n            Refresh\\n          </button>\\n        </div>\\n        <div class=\\"bg-neutral-800/50 rounded-lg p-4 space-y-3 border border-neutral-700/50\\">\\n          {#if embedStatus}\\n            <div class=\\"flex items-center justify-between\\">\\n              <span class=\\"text-xs text-neutral-400\\">Status</span>\\n              <Badge \\n                variant={embedStatus.status === 'done' ? 'success' : embedStatus.status === 'running' ? 'primary' : embedStatus.status === 'error' ? 'danger' : 'secondary'}\\n                size=\\"sm\\"\\n              >\\n                {embedStatus.status}\\n              </Badge>\\n            </div>\\n            {#if embedStatus.status === 'running' || embedStatus.status === 'done'}\\n              <div>\\n                <div class=\\"flex justify-between text-xs mb-1\\">\\n                  <span class=\\"text-neutral-400\\">Progress</span>\\n                  <span class=\\"text-neutral-200\\">{embedStatus.processed?.toLocaleString() ?? 0} / {embedStatus.total?.toLocaleString() ?? 0}</span>\\n                </div>\\n                <div class=\\"w-full bg-neutral-800 rounded-full h-2 overflow-hidden\\">\\n                  <div \\n                    class=\\"bg-blue-500 h-full transition-all duration-500\\"\\n                    style=\\"width: {embedStatus.percent?.toFixed(1) ?? 0}%\\"\\n                  ></div>\\n                </div>\\n                <div class=\\"text-xs text-neutral-500 mt-1\\">{embedStatus.percent?.toFixed(1) ?? 0}%</div>\\n              </div>\\n            {/if}\\n            {#if embedStatus.device}\\n              <div class=\\"flex justify-between text-xs\\">\\n                <span class=\\"text-neutral-400\\">Device</span>\\n                <span class=\\"text-neutral-200 font-mono uppercase\\">{embedStatus.device}</span>\\n              </div>\\n            {/if}\\n            {#if embedStatus.error}\\n              <div class=\\"text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2\\">\\n                {embedStatus.error}\\n              </div>\\n            {/if}\\n          {/if}\\n        </div>\\n      </div>\\n\\n      <!-- Actions -->\\n      <div class=\\"space-y-3\\">\\n        <h3 class=\\"text-sm font-medium text-neutral-300\\">Actions</h3>\\n        <div class=\\"space-y-2\\">\\n          <Button\\n            variant=\\"secondary\\"\\n            size=\\"sm\\"\\n            classes=\\"w-full justify-center\\"\\n            on:click={() => dispatch('initCollection')}\\n          >\\n            New Collection\\n          </Button>\\n          <Button\\n            variant=\\"primary\\"\\n            size=\\"sm\\"\\n            classes=\\"w-full justify-center\\"\\n            on:click={() => { showBatchModal = true; }}\\n          >\\n            Batch Embed\\n          </Button>\\n        </div>\\n      </div>\\n\\n      <!-- Collections -->\\n      <div class=\\"space-y-3\\">\\n        <div class=\\"flex items-center justify-between\\">\\n          <h3 class=\\"text-sm font-medium text-neutral-300\\">Collections</h3>\\n          <button \\n            class=\\"text-xs text-blue-400 hover:text-blue-300\\"\\n            on:click={() => dispatch('refreshCollections')}\\n          >\\n            Refresh\\n          </button>\\n        </div>\\n        <div class=\\"space-y-2\\">\\n          {#if collections?.collections}\\n            {#each collections.collections as col}\\n              <div class=\\"bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3\\">\\n                <div class=\\"flex items-start justify-between gap-2\\">\\n                  <button\\n                    class=\\"flex-1 text-left hover:bg-neutral-800/50 rounded p-1 -m-1 transition-colors\\"\\n                    on:click={() => { if (!isActiveCollection(col.name)) { targetCollection = col.name; showSwitchModal = true; } }}\\n                  >\\n                    <div class=\\"flex items-center gap-2 mb-1\\">\\n                      <span class=\\"text-xs font-mono text-neutral-200\\">{col.name}</span>\\n                      {#if col.is_active_alias_target !== undefined ? col.is_active_alias_target : (col.name === activeAlias)}\\n                        <Badge variant=\\"success\\" size=\\"sm\\">Active</Badge>\\n                      {/if}\\n                    </div>\\n                    <div class=\\"text-xs text-neutral-400\\">\\n                      {col.points_count?.toLocaleString() ?? 0} vectors · {col.vector_size ?? 1024}D\\n                    </div>\\n                  </button>\\n                  {#if !isActiveCollection(col.name)}\\n                    <button\\n                      class=\\"flex-shrink-0 text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-500/10 transition-colors\\"\\n                      on:click={() => { targetCollection = col.name; showDeleteModal = true; }}\\n                      title=\\"Delete collection\\"\\n                    >\\n                      ×\\n                    </button>\\n                  {/if}\\n                </div>\\n              </div>\\n            {/each}\\n          {:else}\\n            <div class=\\"text-xs text-neutral-500 p-4 text-center\\">No collections found</div>\\n          {/if}\\n        </div>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<!-- Batch Embed Modal -->\\n{#if showBatchModal}\\n  <div class=\\"fixed inset-0 bg-black/60 flex items-center justify-center z-[60]\\" on:click={() => { showBatchModal = false; }}>\\n    <div class=\\"bg-neutral-900 border border-neutral-700 rounded-lg max-w-md w-full mx-4 p-6\\" on:click|stopPropagation>\\n      <h3 class=\\"text-lg font-semibold text-neutral-100 mb-4\\">Start Batch Embedding</h3>\\n      <div class=\\"space-y-4\\">\\n        <div>\\n          <label class=\\"text-sm text-neutral-400 mb-1 block\\">From Date</label>\\n          <input \\n            type=\\"date\\" \\n            bind:value={batchFrom}\\n            class=\\"w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100\\"\\n          />\\n        </div>\\n        <div>\\n          <label class=\\"text-sm text-neutral-400 mb-1 block\\">To Date</label>\\n          <input \\n            type=\\"date\\" \\n            bind:value={batchTo}\\n            class=\\"w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100\\"\\n          />\\n        </div>\\n        <div class=\\"flex gap-2\\">\\n          <Button variant=\\"secondary\\" size=\\"sm\\" classes=\\"flex-1 justify-center\\" on:click={() => { showBatchModal = false; }}>\\n            Cancel\\n          </Button>\\n          <Button variant=\\"primary\\" size=\\"sm\\" classes=\\"flex-1 justify-center\\" on:click={handleBatchStart}>\\n            Start\\n          </Button>\\n        </div>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<!-- Collection Switch Confirmation Modal -->\\n{#if showSwitchModal}\\n  <div class=\\"fixed inset-0 bg-black/60 flex items-center justify-center z-[60]\\" on:click={() => { showSwitchModal = false; }}>\\n    <div class=\\"bg-neutral-900 border border-neutral-700 rounded-lg max-w-md w-full mx-4 p-6\\" on:click|stopPropagation>\\n      <h3 class=\\"text-lg font-semibold text-neutral-100 mb-2\\">Switch Collection</h3>\\n      <p class=\\"text-sm text-neutral-400 mb-4\\">\\n        Switch active alias to <span class=\\"font-mono text-neutral-200\\">{targetCollection}</span>? \\n        This change is instant and affects all queries.\\n      </p>\\n      <div class=\\"flex gap-2\\">\\n        <Button variant=\\"secondary\\" size=\\"sm\\" classes=\\"flex-1 justify-center\\" on:click={() => { showSwitchModal = false; }}>\\n          Cancel\\n        </Button>\\n        <Button variant=\\"primary\\" size=\\"sm\\" classes=\\"flex-1 justify-center\\" on:click={handleCollectionSwitch}>\\n          Confirm\\n        </Button>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<!-- Collection Delete Confirmation Modal -->\\n{#if showDeleteModal}\\n  <div class=\\"fixed inset-0 bg-black/60 flex items-center justify-center z-[60]\\" on:click={() => { showDeleteModal = false; }}>\\n    <div class=\\"bg-neutral-900 border border-red-900/50 rounded-lg max-w-md w-full mx-4 p-6\\" on:click|stopPropagation>\\n      <h3 class=\\"text-lg font-semibold text-red-400 mb-2\\">Delete Collection</h3>\\n      <p class=\\"text-sm text-neutral-400 mb-4\\">\\n        Permanently delete <span class=\\"font-mono text-neutral-200\\">{targetCollection}</span>? \\n        This action cannot be undone. All vectors in this collection will be lost.\\n      </p>\\n      <div class=\\"flex gap-2\\">\\n        <Button variant=\\"secondary\\" size=\\"sm\\" classes=\\"flex-1 justify-center\\" on:click={() => { showDeleteModal = false; }}>\\n          Cancel\\n        </Button>\\n        <button\\n          class=\\"flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded transition-colors\\"\\n          on:click={handleCollectionDelete}\\n        >\\n          Delete\\n        </button>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<style>\\n  @keyframes slide-in {\\n    from {\\n      transform: translateX(100%);\\n    }\\n    to {\\n      transform: translateX(0);\\n    }\\n  }\\n\\n  .animate-slide-in {\\n    animation: slide-in 0.3s ease-out;\\n  }\\n</style>\\n\\n"],"names":[],"mappings":"AA0RE,WAAW,sBAAS,CAClB,IAAK,CACH,SAAS,CAAE,WAAW,IAAI,CAC5B,CACA,EAAG,CACD,SAAS,CAAE,WAAW,CAAC,CACzB,CACF,CAEA,+BAAkB,CAChB,SAAS,CAAE,sBAAQ,CAAC,IAAI,CAAC,QAC3B"}`
};
const AdminSidebar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { open = false } = $$props;
  let { embedStatus = null } = $$props;
  let { collections = null } = $$props;
  let { activeAlias = "news_embeddings" } = $$props;
  createEventDispatcher();
  new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  function isActiveCollection(colName) {
    return colName === activeAlias;
  }
  if ($$props.open === void 0 && $$bindings.open && open !== void 0) $$bindings.open(open);
  if ($$props.embedStatus === void 0 && $$bindings.embedStatus && embedStatus !== void 0) $$bindings.embedStatus(embedStatus);
  if ($$props.collections === void 0 && $$bindings.collections && collections !== void 0) $$bindings.collections(collections);
  if ($$props.activeAlias === void 0 && $$bindings.activeAlias && activeAlias !== void 0) $$bindings.activeAlias(activeAlias);
  $$result.css.add(css);
  return `${open ? ` <div class="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"></div>  <div class="fixed right-0 top-0 h-full w-96 bg-neutral-900 border-l border-neutral-800 shadow-2xl z-50 overflow-y-auto animate-slide-in svelte-8gd0xg"><div class="p-6 space-y-6"> <div class="flex items-center justify-between"><h2 class="text-lg font-semibold text-neutral-100" data-svelte-h="svelte-17vaxgz">Admin Panel</h2> <button class="text-neutral-400 hover:text-neutral-200 text-2xl leading-none" data-svelte-h="svelte-bvjgbw">×</button></div>  <div class="space-y-3"><h3 class="text-sm font-medium text-neutral-300" data-svelte-h="svelte-1c3b99d">Vector Store</h3> <div class="bg-neutral-800/50 rounded-lg p-4 space-y-2 border border-neutral-700/50">${embedStatus ? `<div class="flex justify-between text-xs"><span class="text-neutral-400" data-svelte-h="svelte-1ld3gbx">Collection</span> <span class="text-neutral-200 font-mono">${escape(activeAlias)}</span></div> <div class="flex justify-between text-xs"><span class="text-neutral-400" data-svelte-h="svelte-1u6rsd">Vectors</span> <span class="text-neutral-200 font-mono">${escape(embedStatus.vector_count?.toLocaleString() ?? 0)}</span></div> <div class="flex justify-between text-xs"><span class="text-neutral-400" data-svelte-h="svelte-1ernmgu">Dimensions</span> <span class="text-neutral-200 font-mono">${escape(embedStatus.vector_size ?? 1024)}D</span></div>` : `<div class="text-xs text-neutral-500" data-svelte-h="svelte-ebs8ir">Loading status...</div>`}</div></div>  <div class="space-y-3"><div class="flex items-center justify-between"><h3 class="text-sm font-medium text-neutral-300" data-svelte-h="svelte-aljmeo">Embedding Status</h3> <button class="text-xs text-blue-400 hover:text-blue-300" data-svelte-h="svelte-gm063k">Refresh</button></div> <div class="bg-neutral-800/50 rounded-lg p-4 space-y-3 border border-neutral-700/50">${embedStatus ? `<div class="flex items-center justify-between"><span class="text-xs text-neutral-400" data-svelte-h="svelte-qn1wtg">Status</span> ${validate_component(Badge, "Badge").$$render(
    $$result,
    {
      variant: embedStatus.status === "done" ? "success" : embedStatus.status === "running" ? "primary" : embedStatus.status === "error" ? "danger" : "secondary",
      size: "sm"
    },
    {},
    {
      default: () => {
        return `${escape(embedStatus.status)}`;
      }
    }
  )}</div> ${embedStatus.status === "running" || embedStatus.status === "done" ? `<div><div class="flex justify-between text-xs mb-1"><span class="text-neutral-400" data-svelte-h="svelte-1g9hxno">Progress</span> <span class="text-neutral-200">${escape(embedStatus.processed?.toLocaleString() ?? 0)} / ${escape(embedStatus.total?.toLocaleString() ?? 0)}</span></div> <div class="w-full bg-neutral-800 rounded-full h-2 overflow-hidden"><div class="bg-blue-500 h-full transition-all duration-500" style="${"width: " + escape(embedStatus.percent?.toFixed(1) ?? 0, true) + "%"}"></div></div> <div class="text-xs text-neutral-500 mt-1">${escape(embedStatus.percent?.toFixed(1) ?? 0)}%</div></div>` : ``} ${embedStatus.device ? `<div class="flex justify-between text-xs"><span class="text-neutral-400" data-svelte-h="svelte-zy48k3">Device</span> <span class="text-neutral-200 font-mono uppercase">${escape(embedStatus.device)}</span></div>` : ``} ${embedStatus.error ? `<div class="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">${escape(embedStatus.error)}</div>` : ``}` : ``}</div></div>  <div class="space-y-3"><h3 class="text-sm font-medium text-neutral-300" data-svelte-h="svelte-1nn12y6">Actions</h3> <div class="space-y-2">${validate_component(Button, "Button").$$render(
    $$result,
    {
      variant: "secondary",
      size: "sm",
      classes: "w-full justify-center"
    },
    {},
    {
      default: () => {
        return `New Collection`;
      }
    }
  )} ${validate_component(Button, "Button").$$render(
    $$result,
    {
      variant: "primary",
      size: "sm",
      classes: "w-full justify-center"
    },
    {},
    {
      default: () => {
        return `Batch Embed`;
      }
    }
  )}</div></div>  <div class="space-y-3"><div class="flex items-center justify-between"><h3 class="text-sm font-medium text-neutral-300" data-svelte-h="svelte-1tq8c3s">Collections</h3> <button class="text-xs text-blue-400 hover:text-blue-300" data-svelte-h="svelte-1ekw9cl">Refresh</button></div> <div class="space-y-2">${collections?.collections ? `${each(collections.collections, (col) => {
    return `<div class="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3"><div class="flex items-start justify-between gap-2"><button class="flex-1 text-left hover:bg-neutral-800/50 rounded p-1 -m-1 transition-colors"><div class="flex items-center gap-2 mb-1"><span class="text-xs font-mono text-neutral-200">${escape(col.name)}</span> ${(col.is_active_alias_target !== void 0 ? col.is_active_alias_target : col.name === activeAlias) ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "success", size: "sm" }, {}, {
      default: () => {
        return `Active`;
      }
    })}` : ``}</div> <div class="text-xs text-neutral-400">${escape(col.points_count?.toLocaleString() ?? 0)} vectors · ${escape(col.vector_size ?? 1024)}D
                    </div></button> ${!isActiveCollection(col.name) ? `<button class="flex-shrink-0 text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-500/10 transition-colors" title="Delete collection" data-svelte-h="svelte-pcj7qm">×
                    </button>` : ``}</div> </div>`;
  })}` : `<div class="text-xs text-neutral-500 p-4 text-center" data-svelte-h="svelte-61u9ad">No collections found</div>`}</div></div></div></div>` : ``}  ${``}  ${``}  ${``}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let query = "";
  let results = [];
  let loading = false;
  new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  let adminOpen = false;
  let embedStatus = null;
  let collections = null;
  onDestroy(() => {
  });
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = ` <div class="h-screen flex flex-col overflow-hidden bg-neutral-950"> <div class="flex-shrink-0 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm"><div class="max-w-6xl w-full mx-auto px-6 py-4"><div class="flex items-center justify-between"><div class="flex items-center gap-4"><div data-svelte-h="svelte-122p4yl"><h1 class="text-xl font-semibold text-neutral-100">Tesseract</h1> <p class="text-xs text-neutral-500 mt-0.5">Semantic Intelligence Layer</p></div> ${``}</div> <div class="flex items-center gap-3">${results.length > 0 ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "success" }, {}, {
      default: () => {
        return `${escape(results.length)} results`;
      }
    })}` : ``} ${validate_component(Button, "Button").$$render($$result, { variant: "secondary", size: "sm" }, {}, {
      default: () => {
        return `Admin`;
      }
    })}</div></div></div></div>  <div class="flex-shrink-0 bg-neutral-900/30"><div class="max-w-6xl w-full mx-auto px-6 py-6"><div class="space-y-4"> <div class="flex gap-2"><input type="text" placeholder="What are you looking for? (e.g., 'semiconductor supply chain constraints')" class="flex-1 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"${add_attribute("value", query, 0)}> ${validate_component(Button, "Button").$$render(
      $$result,
      {
        variant: "primary",
        size: "md",
        loading,
        classes: "px-6"
      },
      {},
      {
        default: () => {
          return `Search`;
        }
      }
    )}</div>  <div class="flex items-center gap-2"><button class="text-xs text-neutral-400 hover:text-neutral-300 transition-colors">${escape("▶")} Filters</button></div>  ${``}</div></div></div>  <div class="flex-1 overflow-y-auto"><div class="max-w-6xl w-full mx-auto px-6 py-6">${``} ${`${results.length > 0 ? `<div class="space-y-4">${each(results, (result) => {
      return `<div class="relative group"><div class="absolute -top-2 -left-2 z-10">${validate_component(Badge, "Badge").$$render($$result, { variant: "primary", size: "sm" }, {}, {
        default: () => {
          return `${escape((result.score * 100).toFixed(0))}%
                `;
        }
      })}</div> <div class="transition-all duration-200 hover:-translate-y-0.5">${validate_component(NewsCard, "NewsCard").$$render($$result, { item: result }, {}, {})}</div> <div class="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">${validate_component(Button, "Button").$$render($$result, { variant: "secondary", size: "sm" }, {}, {
        default: () => {
          return `Similar
                `;
        }
      })}</div> </div>`;
    })}</div>` : `${`<div class="flex flex-col items-center justify-center py-20 text-center"><svg class="w-16 h-16 text-neutral-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> <h3 class="text-lg font-semibold text-neutral-300 mb-1" data-svelte-h="svelte-hd449o">Start your semantic search</h3> <p class="text-sm text-neutral-500 mb-4" data-svelte-h="svelte-1npvmic">Enter a natural language query to find relevant news</p> <div class="flex flex-wrap gap-2 justify-center"><button class="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-neutral-300 transition-colors" data-svelte-h="svelte-1y8ju51">semiconductor supply chain</button> <button class="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-neutral-300 transition-colors" data-svelte-h="svelte-88qy6p">NVIDIA AI chips</button> <button class="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-neutral-300 transition-colors" data-svelte-h="svelte-8rkfl9">gold prices market sentiment</button></div></div>`}`}`}</div></div></div>  ${validate_component(AdminSidebar, "AdminSidebar").$$render(
      $$result,
      {
        embedStatus,
        collections,
        activeAlias: "news_embeddings",
        open: adminOpen
      },
      {
        open: ($$value) => {
          adminOpen = $$value;
          $$settled = false;
        }
      },
      {}
    )}  ${``}`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};

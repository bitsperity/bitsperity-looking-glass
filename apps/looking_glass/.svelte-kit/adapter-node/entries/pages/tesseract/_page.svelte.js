import { c as create_ssr_component, f as createEventDispatcher, v as validate_component, e as escape, d as add_attribute, b as each, o as onDestroy } from "../../../chunks/ssr.js";
import { C as Card } from "../../../chunks/Card.js";
import { B as Badge } from "../../../chunks/Badge.js";
import { B as Button } from "../../../chunks/Button.js";
import { w as writable } from "../../../chunks/index.js";
import "cytoscape";
new AbortController();
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
  code: "@keyframes svelte-qay7vf-slide-in{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes svelte-qay7vf-fade-in{from{opacity:0}to{opacity:1}}@keyframes svelte-qay7vf-scale-in{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}@keyframes svelte-qay7vf-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}.animate-slide-in.svelte-qay7vf{animation:svelte-qay7vf-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)}.animate-fade-in.svelte-qay7vf{animation:svelte-qay7vf-fade-in 0.2s ease-out}.animate-scale-in.svelte-qay7vf{animation:svelte-qay7vf-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)}.animate-shimmer.svelte-qay7vf{animation:svelte-qay7vf-shimmer 2s infinite}",
  map: `{"version":3,"file":"AdminSidebar.svelte","sources":["AdminSidebar.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { createEventDispatcher } from \\"svelte\\";\\nimport Button from \\"../shared/Button.svelte\\";\\nimport Badge from \\"../shared/Badge.svelte\\";\\nexport let open = false;\\nexport let embedStatus = null;\\nexport let collections = null;\\nexport let activeAlias = \\"news_embeddings\\";\\nconst dispatch = createEventDispatcher();\\nlet batchFrom = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);\\nlet batchTo = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);\\nlet showBatchModal = false;\\nlet showSwitchModal = false;\\nlet showResetModal = false;\\nlet targetCollection = \\"\\";\\n$: if (embedStatus) {\\n}\\nfunction handleBatchStart() {\\n  dispatch(\\"batchStart\\", { from: batchFrom, to: batchTo, body_only: true, incremental: true });\\n  showBatchModal = false;\\n}\\nfunction handleCollectionSwitch() {\\n  dispatch(\\"collectionSwitch\\", { name: targetCollection });\\n  showSwitchModal = false;\\n}\\nasync function handleFactoryReset() {\\n  try {\\n    const response = await fetch(\\"http://localhost:8081/v1/admin/reset\\", { method: \\"POST\\" });\\n    if (!response.ok) throw new Error(\\"Reset failed\\");\\n    showResetModal = false;\\n    dispatch(\\"refreshStatus\\");\\n    dispatch(\\"refreshCollections\\");\\n  } catch (e) {\\n    console.error(\\"Factory reset failed:\\", e);\\n  }\\n}\\nfunction isActiveCollection(colName) {\\n  return colName === activeAlias;\\n}\\nfunction isOverallStatus(status) {\\n  return \\"collection_name\\" in status;\\n}\\nfunction getStatusColor(status) {\\n  switch (status) {\\n    case \\"running\\":\\n      return \\"from-blue-500/20 to-purple-500/20 border-blue-500/30\\";\\n    case \\"done\\":\\n      return \\"from-emerald-500/20 to-teal-500/20 border-emerald-500/30\\";\\n    case \\"error\\":\\n      return \\"from-red-500/20 to-orange-500/20 border-red-500/30\\";\\n    default:\\n      return \\"from-neutral-500/10 to-neutral-600/10 border-neutral-500/20\\";\\n  }\\n}\\nfunction getStatusIcon(status) {\\n  switch (status) {\\n    case \\"running\\":\\n      return \\"\\\\u26A1\\";\\n    case \\"done\\":\\n      return \\"\\\\u2713\\";\\n    case \\"error\\":\\n      return \\"\\\\u26A0\\";\\n    default:\\n      return \\"\\\\u25CB\\";\\n  }\\n}\\n<\/script>\\n\\n{#if open}\\n  <!-- Backdrop with glassmorphism -->\\n  <button \\n    type=\\"button\\"\\n    aria-label=\\"Close admin panel\\"\\n    class=\\"fixed inset-0 bg-gradient-to-br from-black/50 via-neutral-900/40 to-black/60 backdrop-blur-sm z-40 transition-all duration-300\\"\\n    on:click={() => { open = false; }}\\n  ></button>\\n\\n  <!-- Sidebar with modern design -->\\n  <div class=\\"fixed right-0 top-0 h-full w-[420px] bg-gradient-to-br from-neutral-900/95 via-neutral-900/98 to-neutral-950/95 backdrop-blur-xl border-l border-neutral-700/50 shadow-2xl z-50 overflow-y-auto animate-slide-in\\">\\n    <div class=\\"relative\\">\\n      <!-- Decorative gradient overlay -->\\n      <div class=\\"absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none\\"></div>\\n      \\n      <div class=\\"relative p-6 space-y-6\\">\\n        <!-- Header with close button -->\\n        <div class=\\"flex items-center justify-between\\">\\n          <div>\\n            <h2 class=\\"text-xl font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent\\">Admin Panel</h2>\\n            <p class=\\"text-xs text-neutral-500 mt-1\\">Tesseract Vector Store</p>\\n          </div>\\n          <button \\n            class=\\"text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded-lg w-8 h-8 flex items-center justify-center transition-all\\"\\n            on:click={() => { open = false; }}\\n            aria-label=\\"Close panel\\"\\n          >\\n            <svg class=\\"w-5 h-5\\" fill=\\"none\\" stroke=\\"currentColor\\" viewBox=\\"0 0 24 24\\">\\n              <path stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" stroke-width=\\"2\\" d=\\"M6 18L18 6M6 6l12 12\\" />\\n            </svg>\\n          </button>\\n        </div>\\n\\n        <!-- Vector Store Status Card -->\\n        <div class=\\"space-y-3\\">\\n          <div class=\\"flex items-center gap-2\\">\\n            <svg class=\\"w-4 h-4 text-blue-400\\" fill=\\"none\\" stroke=\\"currentColor\\" viewBox=\\"0 0 24 24\\">\\n              <path stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" stroke-width=\\"2\\" d=\\"M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10\\" />\\n            </svg>\\n            <h3 class=\\"text-sm font-semibold text-neutral-200\\">Vector Store</h3>\\n          </div>\\n          <div class=\\"bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-xl p-5 space-y-3 border border-neutral-700/30 shadow-lg backdrop-blur-sm\\">\\n            {#if embedStatus}\\n              {#if isOverallStatus(embedStatus)}\\n                <div class=\\"grid grid-cols-2 gap-3\\">\\n                  <div class=\\"bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30\\">\\n                    <div class=\\"text-xs text-neutral-500 mb-1\\">Collection</div>\\n                    <div class=\\"text-sm font-mono text-neutral-100 truncate\\">{embedStatus.collection_name}</div>\\n                  </div>\\n                  <div class=\\"bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30\\">\\n                    <div class=\\"text-xs text-neutral-500 mb-1\\">Dimensions</div>\\n                    <div class=\\"text-sm font-mono text-blue-400\\">{embedStatus.vector_size}D</div>\\n                  </div>\\n                  <div class=\\"bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-3 border border-blue-500/20\\">\\n                    <div class=\\"text-xs text-blue-400 mb-1\\">Vectors</div>\\n                    <div class=\\"text-lg font-bold text-neutral-100\\">{embedStatus.total_vectors.toLocaleString()}</div>\\n                  </div>\\n                  <div class=\\"bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-lg p-3 border border-emerald-500/20\\">\\n                    <div class=\\"text-xs text-emerald-400 mb-1\\">Articles</div>\\n                    <div class=\\"text-lg font-bold text-neutral-100\\">{embedStatus.total_embedded_articles.toLocaleString()}</div>\\n                  </div>\\n                </div>\\n              {/if}\\n            {:else}\\n              <div class=\\"text-sm text-neutral-500 flex items-center gap-2\\">\\n                <div class=\\"w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin\\"></div>\\n                Loading status...\\n              </div>\\n            {/if}\\n          </div>\\n        </div>\\n\\n        <!-- Embedding Status Card -->\\n        <div class=\\"space-y-3\\">\\n          <div class=\\"flex items-center justify-between\\">\\n            <div class=\\"flex items-center gap-2\\">\\n              <svg class=\\"w-4 h-4 text-purple-400\\" fill=\\"none\\" stroke=\\"currentColor\\" viewBox=\\"0 0 24 24\\">\\n                <path stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" stroke-width=\\"2\\" d=\\"M13 10V3L4 14h7v7l9-11h-7z\\" />\\n              </svg>\\n              <h3 class=\\"text-sm font-semibold text-neutral-200\\">Embedding Status</h3>\\n            </div>\\n            <button \\n              class=\\"text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 py-1 rounded transition-all\\"\\n              on:click={() => dispatch('refreshStatus')}\\n            >\\n              ↻ Refresh\\n            </button>\\n          </div>\\n          <div class=\\"bg-gradient-to-br {embedStatus && !isOverallStatus(embedStatus) ? getStatusColor(embedStatus.status) : 'from-neutral-800/40 to-neutral-900/40'} rounded-xl p-5 space-y-4 border shadow-lg backdrop-blur-sm transition-all duration-500\\">\\n            {#if embedStatus && !isOverallStatus(embedStatus)}\\n              <div class=\\"flex items-center justify-between\\">\\n                <span class=\\"text-xs font-medium text-neutral-400\\">Current Job</span>\\n                <div class=\\"flex items-center gap-2\\">\\n                  <span class=\\"text-lg\\">{getStatusIcon(embedStatus.status)}</span>\\n                  <Badge \\n                    variant={embedStatus.status === 'done' ? 'success' : embedStatus.status === 'running' ? 'primary' : embedStatus.status === 'error' ? 'error' : 'secondary'}\\n                    size=\\"sm\\"\\n                  >\\n                    {embedStatus.status.toUpperCase()}\\n                  </Badge>\\n                </div>\\n              </div>\\n              {#if embedStatus.status === 'running' || embedStatus.status === 'done'}\\n                <div>\\n                  <div class=\\"flex justify-between text-xs mb-2\\">\\n                    <span class=\\"text-neutral-400 font-medium\\">Progress</span>\\n                    <span class=\\"text-neutral-200 font-mono\\">{embedStatus.processed.toLocaleString()} / {embedStatus.total.toLocaleString()}</span>\\n                  </div>\\n                  <div class=\\"relative w-full bg-neutral-900/50 rounded-full h-2.5 overflow-hidden shadow-inner\\">\\n                    <div \\n                      class=\\"absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 h-full transition-all duration-500 ease-out shadow-lg\\"\\n                      style=\\"width: {embedStatus.percent.toFixed(1)}%\\"\\n                    >\\n                      <div class=\\"absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer\\"></div>\\n                    </div>\\n                  </div>\\n                  <div class=\\"text-xs text-neutral-400 mt-2 font-mono\\">{embedStatus.percent.toFixed(1)}% complete</div>\\n                </div>\\n              {/if}\\n              {#if embedStatus.error}\\n                <div class=\\"text-xs text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg p-3 font-mono\\">\\n                  {embedStatus.error}\\n                </div>\\n              {/if}\\n            {:else}\\n              <div class=\\"text-sm text-neutral-500 text-center py-2\\">\\n                <div class=\\"text-2xl mb-2 opacity-40\\">⏸</div>\\n                No active job\\n              </div>\\n            {/if}\\n          </div>\\n        </div>\\n\\n        <!-- Actions -->\\n        <div class=\\"space-y-3\\">\\n          <div class=\\"flex items-center gap-2\\">\\n            <svg class=\\"w-4 h-4 text-emerald-400\\" fill=\\"none\\" stroke=\\"currentColor\\" viewBox=\\"0 0 24 24\\">\\n              <path stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" stroke-width=\\"2\\" d=\\"M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4\\" />\\n            </svg>\\n            <h3 class=\\"text-sm font-semibold text-neutral-200\\">Actions</h3>\\n          </div>\\n          <div class=\\"grid grid-cols-2 gap-2\\">\\n            <button\\n              class=\\"bg-gradient-to-br from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-500/30 rounded-lg px-4 py-3 text-sm font-medium text-blue-300 transition-all hover:shadow-lg hover:shadow-blue-500/10 hover:scale-105\\"\\n              on:click={() => { showBatchModal = true; }}\\n            >\\n              <div class=\\"text-lg mb-1\\">⚡</div>\\n              Batch Embed\\n            </button>\\n            <button\\n              class=\\"bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 rounded-lg px-4 py-3 text-sm font-medium text-emerald-300 transition-all hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-105\\"\\n              on:click={() => dispatch('initCollection')}\\n            >\\n              <div class=\\"text-lg mb-1\\">➕</div>\\n              New Collection\\n            </button>\\n            <button\\n              class=\\"col-span-2 bg-gradient-to-br from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-sm font-medium text-red-300 transition-all hover:shadow-lg hover:shadow-red-500/10\\"\\n              on:click={() => { showResetModal = true; }}\\n            >\\n              <div class=\\"flex items-center justify-center gap-2\\">\\n                <span class=\\"text-lg\\">🔄</span>\\n                <span>Factory Reset</span>\\n              </div>\\n            </button>\\n          </div>\\n        </div>\\n\\n        <!-- Collections -->\\n        <div class=\\"space-y-3\\">\\n          <div class=\\"flex items-center justify-between\\">\\n            <div class=\\"flex items-center gap-2\\">\\n              <svg class=\\"w-4 h-4 text-purple-400\\" fill=\\"none\\" stroke=\\"currentColor\\" viewBox=\\"0 0 24 24\\">\\n                <path stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" stroke-width=\\"2\\" d=\\"M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4\\" />\\n              </svg>\\n              <h3 class=\\"text-sm font-semibold text-neutral-200\\">Collections</h3>\\n            </div>\\n            <button \\n              class=\\"text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2 py-1 rounded transition-all\\"\\n              on:click={() => dispatch('refreshCollections')}\\n            >\\n              ↻ Refresh\\n            </button>\\n          </div>\\n          <div class=\\"space-y-2\\">\\n            {#if collections?.collections}\\n              {#each collections.collections as col}\\n                <button\\n                  class=\\"w-full bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 hover:from-neutral-800/60 hover:to-neutral-900/60 border border-neutral-700/30 rounded-lg p-4 transition-all hover:shadow-lg text-left group\\"\\n                  disabled={isActiveCollection(col.name)}\\n                  on:click={() => { if (!isActiveCollection(col.name)) { targetCollection = col.name; showSwitchModal = true; } }}\\n                >\\n                  <div class=\\"flex items-start justify-between gap-2 mb-2\\">\\n                    <span class=\\"text-sm font-mono text-neutral-200 group-hover:text-neutral-100 transition-colors\\">{col.name}</span>\\n                    {#if isActiveCollection(col.name)}\\n                      <Badge variant=\\"success\\" size=\\"sm\\">Active</Badge>\\n                    {/if}\\n                  </div>\\n                  <div class=\\"flex items-center gap-3 text-xs\\">\\n                    <span class=\\"text-blue-400 font-mono\\">{col.points_count.toLocaleString()} vectors</span>\\n                    <span class=\\"text-neutral-600\\">·</span>\\n                    <span class=\\"text-purple-400 font-mono\\">{col.vector_size}D</span>\\n                  </div>\\n                </button>\\n              {/each}\\n            {:else}\\n              <div class=\\"text-sm text-neutral-500 text-center py-8\\">\\n                <div class=\\"text-3xl mb-2 opacity-30\\">📦</div>\\n                No collections found\\n              </div>\\n            {/if}\\n          </div>\\n        </div>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<!-- Batch Embed Modal -->\\n{#if showBatchModal}\\n  <button\\n    type=\\"button\\"\\n    class=\\"fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] animate-fade-in\\"\\n    on:click={() => { showBatchModal = false; }}\\n    aria-label=\\"Close batch embed modal\\"\\n  ></button>\\n  <div class=\\"fixed inset-0 flex items-center justify-center z-[60] animate-scale-in\\" on:click|stopPropagation>\\n    <div class=\\"bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-700/50 rounded-2xl max-w-md w-full mx-4 p-6 shadow-2xl\\">\\n      <div class=\\"flex items-center gap-3 mb-6\\">\\n        <div class=\\"w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center text-lg\\">⚡</div>\\n        <h3 class=\\"text-lg font-bold text-neutral-100\\">Start Batch Embedding</h3>\\n      </div>\\n      <div class=\\"space-y-4\\">\\n        <div>\\n          <label for=\\"batchFrom\\" class=\\"text-sm font-medium text-neutral-300 mb-2 block\\">From Date</label>\\n          <input \\n            type=\\"date\\" \\n            id=\\"batchFrom\\"\\n            bind:value={batchFrom}\\n            class=\\"w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all\\"\\n          />\\n        </div>\\n        <div>\\n          <label for=\\"batchTo\\" class=\\"text-sm font-medium text-neutral-300 mb-2 block\\">To Date</label>\\n          <input \\n            type=\\"date\\" \\n            id=\\"batchTo\\"\\n            bind:value={batchTo}\\n            class=\\"w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all\\"\\n          />\\n        </div>\\n        <div class=\\"flex gap-3 pt-2\\">\\n          <button\\n            class=\\"flex-1 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-300 hover:text-neutral-100 transition-all\\"\\n            on:click={() => { showBatchModal = false; }}\\n          >\\n            Cancel\\n          </button>\\n          <button\\n            class=\\"flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transition-all\\"\\n            on:click={handleBatchStart}\\n          >\\n            Start Embedding\\n          </button>\\n        </div>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<!-- Collection Switch Modal -->\\n{#if showSwitchModal}\\n  <button\\n    type=\\"button\\"\\n    class=\\"fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] animate-fade-in\\"\\n    on:click={() => { showSwitchModal = false; }}\\n    aria-label=\\"Close switch collection modal\\"\\n  ></button>\\n  <div class=\\"fixed inset-0 flex items-center justify-center z-[60] animate-scale-in\\" on:click|stopPropagation>\\n    <div class=\\"bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-700/50 rounded-2xl max-w-md w-full mx-4 p-6 shadow-2xl\\">\\n      <div class=\\"flex items-center gap-3 mb-4\\">\\n        <div class=\\"w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-lg\\">🔄</div>\\n        <h3 class=\\"text-lg font-bold text-neutral-100\\">Switch Collection</h3>\\n      </div>\\n      <p class=\\"text-sm text-neutral-400 mb-6\\">\\n        Switch active alias to <span class=\\"font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded\\">{targetCollection}</span>? This change is instant and affects all queries.\\n      </p>\\n      <div class=\\"flex gap-3\\">\\n        <button\\n          class=\\"flex-1 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-300 hover:text-neutral-100 transition-all\\"\\n          on:click={() => { showSwitchModal = false; }}\\n        >\\n          Cancel\\n        </button>\\n        <button\\n          class=\\"flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/20 transition-all\\"\\n          on:click={handleCollectionSwitch}\\n        >\\n          Confirm Switch\\n        </button>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<!-- Factory Reset Confirmation Modal -->\\n{#if showResetModal}\\n  <button\\n    type=\\"button\\"\\n    class=\\"fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] animate-fade-in\\"\\n    on:click={() => { showResetModal = false; }}\\n    aria-label=\\"Close factory reset modal\\"\\n  ></button>\\n  <div class=\\"fixed inset-0 flex items-center justify-center z-[60] animate-scale-in\\" on:click|stopPropagation>\\n    <div class=\\"bg-gradient-to-br from-neutral-900 to-neutral-950 border border-red-500/30 rounded-2xl max-w-md w-full mx-4 p-6 shadow-2xl\\">\\n      <div class=\\"flex items-center gap-3 mb-4\\">\\n        <div class=\\"w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center text-lg\\">⚠️</div>\\n        <h3 class=\\"text-lg font-bold text-red-300\\">Factory Reset</h3>\\n      </div>\\n      <div class=\\"bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6\\">\\n        <p class=\\"text-sm text-red-300 font-medium mb-2\\">⚠️ Warning: This action cannot be undone!</p>\\n        <p class=\\"text-sm text-neutral-400\\">\\n          This will permanently delete:\\n        </p>\\n        <ul class=\\"text-sm text-neutral-400 mt-2 space-y-1 ml-4\\">\\n          <li>• All Qdrant collections and vectors</li>\\n          <li>• All embedding job history</li>\\n          <li>• All tracking data in SQLite</li>\\n        </ul>\\n      </div>\\n      <div class=\\"flex gap-3\\">\\n        <button\\n          class=\\"flex-1 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-300 hover:text-neutral-100 transition-all\\"\\n          on:click={() => { showResetModal = false; }}\\n        >\\n          Cancel\\n        </button>\\n        <button\\n          class=\\"flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:shadow-red-500/20 transition-all\\"\\n          on:click={handleFactoryReset}\\n        >\\n          Reset Everything\\n        </button>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<style>\\n  @keyframes slide-in {\\n    from {\\n      transform: translateX(100%);\\n      opacity: 0;\\n    }\\n    to {\\n      transform: translateX(0);\\n      opacity: 1;\\n    }\\n  }\\n\\n  @keyframes fade-in {\\n    from { opacity: 0; }\\n    to { opacity: 1; }\\n  }\\n\\n  @keyframes scale-in {\\n    from {\\n      opacity: 0;\\n      transform: scale(0.95);\\n    }\\n    to {\\n      opacity: 1;\\n      transform: scale(1);\\n    }\\n  }\\n\\n  @keyframes shimmer {\\n    0% { transform: translateX(-100%); }\\n    100% { transform: translateX(100%); }\\n  }\\n\\n  .animate-slide-in {\\n    animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);\\n  }\\n\\n  .animate-fade-in {\\n    animation: fade-in 0.2s ease-out;\\n  }\\n\\n  .animate-scale-in {\\n    animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);\\n  }\\n\\n  .animate-shimmer {\\n    animation: shimmer 2s infinite;\\n  }\\n</style>\\n"],"names":[],"mappings":"AAgaE,WAAW,sBAAS,CAClB,IAAK,CACH,SAAS,CAAE,WAAW,IAAI,CAAC,CAC3B,OAAO,CAAE,CACX,CACA,EAAG,CACD,SAAS,CAAE,WAAW,CAAC,CAAC,CACxB,OAAO,CAAE,CACX,CACF,CAEA,WAAW,qBAAQ,CACjB,IAAK,CAAE,OAAO,CAAE,CAAG,CACnB,EAAG,CAAE,OAAO,CAAE,CAAG,CACnB,CAEA,WAAW,sBAAS,CAClB,IAAK,CACH,OAAO,CAAE,CAAC,CACV,SAAS,CAAE,MAAM,IAAI,CACvB,CACA,EAAG,CACD,OAAO,CAAE,CAAC,CACV,SAAS,CAAE,MAAM,CAAC,CACpB,CACF,CAEA,WAAW,qBAAQ,CACjB,EAAG,CAAE,SAAS,CAAE,WAAW,KAAK,CAAG,CACnC,IAAK,CAAE,SAAS,CAAE,WAAW,IAAI,CAAG,CACtC,CAEA,+BAAkB,CAChB,SAAS,CAAE,sBAAQ,CAAC,IAAI,CAAC,aAAa,IAAI,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,CAAC,CAAC,CACvD,CAEA,8BAAiB,CACf,SAAS,CAAE,qBAAO,CAAC,IAAI,CAAC,QAC1B,CAEA,+BAAkB,CAChB,SAAS,CAAE,sBAAQ,CAAC,IAAI,CAAC,aAAa,IAAI,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,CAAC,CAAC,CACvD,CAEA,8BAAiB,CACf,SAAS,CAAE,qBAAO,CAAC,EAAE,CAAC,QACxB"}`
};
function isOverallStatus(status) {
  return "collection_name" in status;
}
function getStatusColor(status) {
  switch (status) {
    case "running":
      return "from-blue-500/20 to-purple-500/20 border-blue-500/30";
    case "done":
      return "from-emerald-500/20 to-teal-500/20 border-emerald-500/30";
    case "error":
      return "from-red-500/20 to-orange-500/20 border-red-500/30";
    default:
      return "from-neutral-500/10 to-neutral-600/10 border-neutral-500/20";
  }
}
function getStatusIcon(status) {
  switch (status) {
    case "running":
      return "⚡";
    case "done":
      return "✓";
    case "error":
      return "⚠";
    default:
      return "○";
  }
}
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
  return `${open ? ` <button type="button" aria-label="Close admin panel" class="fixed inset-0 bg-gradient-to-br from-black/50 via-neutral-900/40 to-black/60 backdrop-blur-sm z-40 transition-all duration-300"></button>  <div class="fixed right-0 top-0 h-full w-[420px] bg-gradient-to-br from-neutral-900/95 via-neutral-900/98 to-neutral-950/95 backdrop-blur-xl border-l border-neutral-700/50 shadow-2xl z-50 overflow-y-auto animate-slide-in svelte-qay7vf"><div class="relative"> <div class="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none"></div> <div class="relative p-6 space-y-6"> <div class="flex items-center justify-between"><div data-svelte-h="svelte-1d17gzn"><h2 class="text-xl font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent">Admin Panel</h2> <p class="text-xs text-neutral-500 mt-1">Tesseract Vector Store</p></div> <button class="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded-lg w-8 h-8 flex items-center justify-center transition-all" aria-label="Close panel" data-svelte-h="svelte-1eyv8vl"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>  <div class="space-y-3"><div class="flex items-center gap-2" data-svelte-h="svelte-fmg1n8"><svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg> <h3 class="text-sm font-semibold text-neutral-200">Vector Store</h3></div> <div class="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-xl p-5 space-y-3 border border-neutral-700/30 shadow-lg backdrop-blur-sm">${embedStatus ? `${isOverallStatus(embedStatus) ? `<div class="grid grid-cols-2 gap-3"><div class="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30"><div class="text-xs text-neutral-500 mb-1" data-svelte-h="svelte-10w4fpo">Collection</div> <div class="text-sm font-mono text-neutral-100 truncate">${escape(embedStatus.collection_name)}</div></div> <div class="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30"><div class="text-xs text-neutral-500 mb-1" data-svelte-h="svelte-rgvzor">Dimensions</div> <div class="text-sm font-mono text-blue-400">${escape(embedStatus.vector_size)}D</div></div> <div class="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-3 border border-blue-500/20"><div class="text-xs text-blue-400 mb-1" data-svelte-h="svelte-sa36qs">Vectors</div> <div class="text-lg font-bold text-neutral-100">${escape(embedStatus.total_vectors.toLocaleString())}</div></div> <div class="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-lg p-3 border border-emerald-500/20"><div class="text-xs text-emerald-400 mb-1" data-svelte-h="svelte-1azecfh">Articles</div> <div class="text-lg font-bold text-neutral-100">${escape(embedStatus.total_embedded_articles.toLocaleString())}</div></div></div>` : ``}` : `<div class="text-sm text-neutral-500 flex items-center gap-2" data-svelte-h="svelte-b9abu8"><div class="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                Loading status...</div>`}</div></div>  <div class="space-y-3"><div class="flex items-center justify-between"><div class="flex items-center gap-2" data-svelte-h="svelte-16hxgks"><svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> <h3 class="text-sm font-semibold text-neutral-200">Embedding Status</h3></div> <button class="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 py-1 rounded transition-all" data-svelte-h="svelte-1dxr6ip">↻ Refresh</button></div> <div class="${"bg-gradient-to-br " + escape(
    embedStatus && !isOverallStatus(embedStatus) ? getStatusColor(embedStatus.status) : "from-neutral-800/40 to-neutral-900/40",
    true
  ) + " rounded-xl p-5 space-y-4 border shadow-lg backdrop-blur-sm transition-all duration-500 svelte-qay7vf"}">${embedStatus && !isOverallStatus(embedStatus) ? `<div class="flex items-center justify-between"><span class="text-xs font-medium text-neutral-400" data-svelte-h="svelte-171ed4v">Current Job</span> <div class="flex items-center gap-2"><span class="text-lg">${escape(getStatusIcon(embedStatus.status))}</span> ${validate_component(Badge, "Badge").$$render(
    $$result,
    {
      variant: embedStatus.status === "done" ? "success" : embedStatus.status === "running" ? "primary" : embedStatus.status === "error" ? "error" : "secondary",
      size: "sm"
    },
    {},
    {
      default: () => {
        return `${escape(embedStatus.status.toUpperCase())}`;
      }
    }
  )}</div></div> ${embedStatus.status === "running" || embedStatus.status === "done" ? `<div><div class="flex justify-between text-xs mb-2"><span class="text-neutral-400 font-medium" data-svelte-h="svelte-1fbxvfp">Progress</span> <span class="text-neutral-200 font-mono">${escape(embedStatus.processed.toLocaleString())} / ${escape(embedStatus.total.toLocaleString())}</span></div> <div class="relative w-full bg-neutral-900/50 rounded-full h-2.5 overflow-hidden shadow-inner"><div class="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 h-full transition-all duration-500 ease-out shadow-lg" style="${"width: " + escape(embedStatus.percent.toFixed(1), true) + "%"}"><div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer svelte-qay7vf"></div></div></div> <div class="text-xs text-neutral-400 mt-2 font-mono">${escape(embedStatus.percent.toFixed(1))}% complete</div></div>` : ``} ${embedStatus.error ? `<div class="text-xs text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg p-3 font-mono">${escape(embedStatus.error)}</div>` : ``}` : `<div class="text-sm text-neutral-500 text-center py-2" data-svelte-h="svelte-44toxt"><div class="text-2xl mb-2 opacity-40">⏸</div>
                No active job</div>`}</div></div>  <div class="space-y-3"><div class="flex items-center gap-2" data-svelte-h="svelte-r7ppie"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg> <h3 class="text-sm font-semibold text-neutral-200">Actions</h3></div> <div class="grid grid-cols-2 gap-2"><button class="bg-gradient-to-br from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-500/30 rounded-lg px-4 py-3 text-sm font-medium text-blue-300 transition-all hover:shadow-lg hover:shadow-blue-500/10 hover:scale-105" data-svelte-h="svelte-19fcca"><div class="text-lg mb-1">⚡</div>
              Batch Embed</button> <button class="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 rounded-lg px-4 py-3 text-sm font-medium text-emerald-300 transition-all hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-105" data-svelte-h="svelte-ttdolc"><div class="text-lg mb-1">➕</div>
              New Collection</button> <button class="col-span-2 bg-gradient-to-br from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-sm font-medium text-red-300 transition-all hover:shadow-lg hover:shadow-red-500/10" data-svelte-h="svelte-t28i1d"><div class="flex items-center justify-center gap-2"><span class="text-lg">🔄</span> <span>Factory Reset</span></div></button></div></div>  <div class="space-y-3"><div class="flex items-center justify-between"><div class="flex items-center gap-2" data-svelte-h="svelte-1ia5twh"><svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg> <h3 class="text-sm font-semibold text-neutral-200">Collections</h3></div> <button class="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2 py-1 rounded transition-all" data-svelte-h="svelte-1remu78">↻ Refresh</button></div> <div class="space-y-2">${collections?.collections ? `${each(collections.collections, (col) => {
    return `<button class="w-full bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 hover:from-neutral-800/60 hover:to-neutral-900/60 border border-neutral-700/30 rounded-lg p-4 transition-all hover:shadow-lg text-left group" ${isActiveCollection(col.name) ? "disabled" : ""}><div class="flex items-start justify-between gap-2 mb-2"><span class="text-sm font-mono text-neutral-200 group-hover:text-neutral-100 transition-colors">${escape(col.name)}</span> ${isActiveCollection(col.name) ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "success", size: "sm" }, {}, {
      default: () => {
        return `Active`;
      }
    })}` : ``}</div> <div class="flex items-center gap-3 text-xs"><span class="text-blue-400 font-mono">${escape(col.points_count.toLocaleString())} vectors</span> <span class="text-neutral-600" data-svelte-h="svelte-1akggh6">·</span> <span class="text-purple-400 font-mono">${escape(col.vector_size)}D</span></div> </button>`;
  })}` : `<div class="text-sm text-neutral-500 text-center py-8" data-svelte-h="svelte-14hepei"><div class="text-3xl mb-2 opacity-30">📦</div>
                No collections found</div>`}</div></div></div></div></div>` : ``}  ${``}  ${``}  ${``}`;
});
const defaultState = {
  nodes: [],
  edges: [],
  centerNode: null,
  trail: [],
  initialArticle: null,
  panX: 0,
  panY: 0,
  zoom: 1,
  similarityThreshold: 0.7
};
function createKnowledgeGraphStore() {
  const { subscribe, set, update } = writable(defaultState);
  return {
    subscribe,
    set,
    update,
    reset: () => set(defaultState),
    // Save graph state
    saveState: (state) => {
      update((current) => ({ ...current, ...state }));
    },
    // Initialize with an article
    initializeWithArticle: (article) => {
      update((current) => ({
        ...current,
        initialArticle: article,
        trail: []
      }));
    }
  };
}
createKnowledgeGraphStore();
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let query = "";
  let results = [];
  let loading = false;
  let searchTimeout = null;
  new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  let adminOpen = false;
  let embedStatus = null;
  let collections = null;
  onDestroy(() => {
    clearTimeout(searchTimeout);
  });
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = ` <div class="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950"> <div class="flex-shrink-0 border-b border-neutral-700/20 bg-gradient-to-b from-neutral-900/80 to-neutral-950/60 backdrop-blur-lg shadow-lg"><div class="max-w-6xl w-full mx-auto px-6 py-5"><div class="flex items-center justify-between"><div class="flex items-center gap-6"><div data-svelte-h="svelte-4ykiwm"><h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">Tesseract</h1> <p class="text-xs text-neutral-400 mt-1">Semantic Intelligence Layer</p></div> ${``}</div> <div class="flex items-center gap-3">${results.length > 0 ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "success" }, {}, {
      default: () => {
        return `${escape(results.length)} results`;
      }
    })}` : ``} ${validate_component(Button, "Button").$$render(
      $$result,
      {
        variant: "secondary",
        size: "sm",
        class: "transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
      },
      {},
      {
        default: () => {
          return `Admin`;
        }
      }
    )}</div></div></div></div>  <div class="flex-shrink-0 border-b border-neutral-700/20"><div class="max-w-6xl w-full mx-auto px-6"><div class="flex gap-1"><button class="${"px-6 py-3 text-sm font-semibold transition-all duration-200 border-b-2 " + escape(
      "text-blue-400 border-blue-500",
      true
    )}">Search</button> <button class="${"px-6 py-3 text-sm font-semibold transition-all duration-200 border-b-2 " + escape(
      "text-neutral-400 border-transparent hover:text-neutral-200",
      true
    )}">Knowledge Graph</button></div></div></div>  ${`<div class="flex-shrink-0 bg-gradient-to-b from-neutral-900/40 to-neutral-950/40 backdrop-blur-sm border-b border-neutral-700/10"><div class="max-w-6xl w-full mx-auto px-6 py-6"><div class="space-y-4"> <div class="flex gap-3"><input type="text" placeholder="What are you looking for? (e.g., 'semiconductor supply chain constraints')" class="flex-1 bg-gradient-to-b from-neutral-800/60 to-neutral-900/40 border border-neutral-600/30 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-200 backdrop-blur-sm shadow-lg shadow-neutral-950/50 hover:border-neutral-500/50"${add_attribute("value", query, 0)}> ${validate_component(Button, "Button").$$render(
      $$result,
      {
        variant: "primary",
        size: "md",
        loading,
        class: "px-8 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-200"
      },
      {},
      {
        default: () => {
          return `Search`;
        }
      }
    )}</div>  <div class="flex items-center gap-2"><button class="text-xs text-neutral-400 hover:text-blue-400 transition-colors duration-200 font-medium">${escape("▶")} Filters</button></div>  ${``}</div></div></div>  <div class="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-neutral-900 scrollbar-thumb-neutral-700"><div class="max-w-6xl w-full mx-auto px-6 py-6">${``} ${`${results.length > 0 ? `<div class="space-y-3">${each(results, (result) => {
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
    })}</div>` : `${`<div class="flex flex-col items-center justify-center py-24 text-center"><div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/5 flex items-center justify-center mb-6 border border-blue-500/20" data-svelte-h="svelte-1k6a0y3"><svg class="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div> <h3 class="text-lg font-semibold text-neutral-200 mb-1" data-svelte-h="svelte-qi4ytt">Start your semantic search</h3> <p class="text-sm text-neutral-400 mb-6" data-svelte-h="svelte-17bv2hd">Enter a natural language query to find relevant news</p> <div class="flex flex-wrap gap-2 justify-center"><button class="text-xs px-4 py-2 bg-gradient-to-r from-blue-500/20 to-blue-600/10 hover:from-blue-500/30 hover:to-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 transition-all duration-200 font-medium backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/10" data-svelte-h="svelte-urwnh8">semiconductor supply chain</button> <button class="text-xs px-4 py-2 bg-gradient-to-r from-purple-500/20 to-purple-600/10 hover:from-purple-500/30 hover:to-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 transition-all duration-200 font-medium backdrop-blur-sm hover:shadow-lg hover:shadow-purple-500/10" data-svelte-h="svelte-ydgdta">NVIDIA AI chips</button> <button class="text-xs px-4 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/30 rounded-lg text-amber-300 transition-all duration-200 font-medium backdrop-blur-sm hover:shadow-lg hover:shadow-amber-500/10" data-svelte-h="svelte-1fo9uz9">gold prices market sentiment</button></div></div>`}`}`}</div></div>`}</div>  ${validate_component(AdminSidebar, "AdminSidebar").$$render(
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

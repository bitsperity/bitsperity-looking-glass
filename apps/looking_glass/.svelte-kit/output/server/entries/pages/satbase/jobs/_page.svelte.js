import { c as create_ssr_component, o as onDestroy, f as add_attribute, v as validate_component, e as escape, d as each } from "../../../../chunks/ssr.js";
import { C as Card } from "../../../../chunks/Card.js";
import { B as Button } from "../../../../chunks/Button.js";
import { B as Badge } from "../../../../chunks/Badge.js";
const API_BASE = "http://127.0.0.1:8080";
class ApiError extends Error {
  status;
  body;
  constructor(status, body) {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}
async function apiGet(path) {
  const resp = await fetch(`${API_BASE}${path}`);
  if (resp.status === 202) {
    const body = await resp.json().catch(() => ({}));
    throw new ApiError(202, body);
  }
  if (!resp.ok) {
    const body = await resp.text();
    throw new ApiError(resp.status, body);
  }
  return await resp.json();
}
let refreshInterval = 2e3;
function formatDuration(job) {
  if (!job.started_at) return "-";
  const start = new Date(job.started_at);
  const end = job.completed_at ? new Date(job.completed_at) : /* @__PURE__ */ new Date();
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1e3);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
function formatTime(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function getProgressPercent(job) {
  if (!job.progress_total || job.progress_total === 0) return null;
  return Math.round((job.progress_current || 0) / job.progress_total * 100);
}
function getStatusIcon(status) {
  switch (status) {
    case "queued":
      return "⏳";
    case "running":
      return "🔄";
    case "done":
      return "✓";
    case "error":
      return "✗";
    case "timeout":
      return "⏱";
    case "cancelled":
      return "⊗";
    default:
      return "?";
  }
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let totalJobs;
  let successRate;
  let avgDuration;
  let jobs = [];
  let activeJobs = [];
  let completedJobs = [];
  let failedJobs = [];
  let autoRefresh = true;
  let timer;
  let loading = false;
  let error = null;
  let newPricesTickers = "";
  let newMacroSeries = "";
  let newNewsQuery = "";
  let actionLoading = false;
  let cleanupLoading = false;
  let retryingJobId = null;
  let expandedJobId = null;
  async function loadJobs() {
    loading = true;
    error = null;
    try {
      const res = await apiGet(`/v1/ingest/jobs?limit=200`);
      jobs = res.jobs || [];
      categorizeJobs();
    } catch (e) {
      error = e?.message || String(e);
    } finally {
      loading = false;
    }
  }
  function categorizeJobs() {
    const isJobComplete = (j) => j.status === "done" || j.progress_total && j.progress_total > 0 && j.progress_current === j.progress_total;
    activeJobs = jobs.filter((j) => !isJobComplete(j) && (j.status === "queued" || j.status === "running"));
    completedJobs = jobs.filter((j) => isJobComplete(j) && j.status !== "error" && j.status !== "timeout" && j.status !== "cancelled");
    failedJobs = jobs.filter((j) => j.status === "error" || j.status === "timeout" || j.status === "cancelled");
  }
  function startAutoRefresh() {
    if (timer) clearInterval(timer);
    {
      timer = setInterval(loadJobs, refreshInterval);
    }
  }
  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
  totalJobs = jobs.length;
  successRate = jobs.length > 0 ? Math.round(completedJobs.length / jobs.length * 100) : 0;
  avgDuration = completedJobs.length > 0 ? completedJobs.reduce(
    (sum, j) => {
      if (!j.started_at || !j.completed_at) return sum;
      const ms = new Date(j.completed_at).getTime() - new Date(j.started_at).getTime();
      return sum + ms;
    },
    0
  ) / completedJobs.length / 1e3 : 0;
  {
    startAutoRefresh();
  }
  return `<div class="max-w-7xl mx-auto space-y-4 h-full overflow-y-auto p-6"> <div class="flex items-center justify-between"><div data-svelte-h="svelte-1qdpa66"><h1 class="text-2xl font-bold text-neutral-100">🔧 Jobs Dashboard</h1> <p class="text-sm text-neutral-400 mt-1">Real-time job monitoring and management</p></div> <div class="flex items-center gap-2"><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" class="rounded border-neutral-600 bg-neutral-700 text-blue-600"${add_attribute("checked", autoRefresh, 1)}> <span class="text-neutral-300" data-svelte-h="svelte-1f6utfd">Auto-refresh</span></label> ${validate_component(Button, "Button").$$render(
    $$result,
    {
      variant: "secondary",
      size: "sm",
      disabled: loading
    },
    {},
    {
      default: () => {
        return `${escape(loading ? "⟳" : "↻")} Refresh`;
      }
    }
  )} <button ${""} class="px-3 py-1.5 text-sm rounded-lg bg-neutral-800 text-red-400 hover:text-red-300 hover:bg-neutral-700 disabled:opacity-50 transition-colors">🗑️ Reset</button></div></div>  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">${validate_component(Card, "Card").$$render($$result, { padding: "p-3" }, {}, {
    default: () => {
      return `<div class="text-xs text-neutral-400 uppercase font-semibold" data-svelte-h="svelte-wxbu31">Total Jobs</div> <div class="text-2xl font-bold text-neutral-100 mt-1">${escape(totalJobs)}</div>`;
    }
  })} ${validate_component(Card, "Card").$$render($$result, { padding: "p-3" }, {}, {
    default: () => {
      return `<div class="text-xs text-neutral-400 uppercase font-semibold" data-svelte-h="svelte-imt8zs">Success Rate</div> <div class="text-2xl font-bold text-green-400 mt-1">${escape(successRate)}%</div>`;
    }
  })} ${validate_component(Card, "Card").$$render($$result, { padding: "p-3" }, {}, {
    default: () => {
      return `<div class="text-xs text-neutral-400 uppercase font-semibold" data-svelte-h="svelte-7zclvr">Avg Duration</div> <div class="text-2xl font-bold text-blue-400 mt-1">${escape(avgDuration < 60 ? Math.round(avgDuration) + "s" : (avgDuration / 60).toFixed(1) + "m")}</div>`;
    }
  })} ${validate_component(Card, "Card").$$render($$result, { padding: "p-3" }, {}, {
    default: () => {
      return `<div class="text-xs text-neutral-400 uppercase font-semibold" data-svelte-h="svelte-8509hi">Failed</div> <div class="${"text-2xl font-bold " + escape(
        failedJobs.length > 0 ? "text-red-400" : "text-neutral-500",
        true
      ) + " mt-1"}">${escape(failedJobs.length)}</div>`;
    }
  })}</div>  ${error ? `<div class="${escape(
    error.startsWith("✓") ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300",
    true
  ) + " border rounded-lg p-3 text-sm"}">${escape(error)}</div>` : ``}  ${validate_component(Card, "Card").$$render($$result, {}, {}, {
    default: () => {
      return `<h2 class="text-lg font-semibold text-neutral-100 mb-4" data-svelte-h="svelte-1gh5j41">📥 Quick Ingest</h2> <div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div class="space-y-2"><label for="prices-input" class="text-sm font-medium text-neutral-300" data-svelte-h="svelte-cthhun">💹 Prices (EOD)</label> <div class="flex gap-2"><input id="prices-input" type="text" placeholder="TSM, NVDA, AAPL" class="flex-1 text-sm bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-neutral-100"${add_attribute("value", newPricesTickers, 0)}> ${validate_component(Button, "Button").$$render(
        $$result,
        {
          variant: "primary",
          size: "sm",
          disabled: !newPricesTickers.trim() || actionLoading
        },
        {},
        {
          default: () => {
            return `Ingest`;
          }
        }
      )}</div></div> <div class="space-y-2"><label for="macro-input" class="text-sm font-medium text-neutral-300" data-svelte-h="svelte-3z4bfp">📊 Macro (FRED)</label> <div class="flex gap-2"><input id="macro-input" type="text" placeholder="CPIAUCSL, GDP" class="flex-1 text-sm bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-neutral-100"${add_attribute("value", newMacroSeries, 0)}> ${validate_component(Button, "Button").$$render(
        $$result,
        {
          variant: "primary",
          size: "sm",
          disabled: !newMacroSeries.trim() || actionLoading
        },
        {},
        {
          default: () => {
            return `Ingest`;
          }
        }
      )}</div></div> <div class="space-y-2"><label for="news-input" class="text-sm font-medium text-neutral-300" data-svelte-h="svelte-1pmuofg">📰 News (GDELT)</label> <div class="flex gap-2"><input id="news-input" type="text" placeholder="semiconductor" class="flex-1 text-sm bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-neutral-100"${add_attribute("value", newNewsQuery, 0)}> ${validate_component(Button, "Button").$$render(
        $$result,
        {
          variant: "primary",
          size: "sm",
          disabled: !newNewsQuery.trim() || actionLoading
        },
        {},
        {
          default: () => {
            return `Ingest`;
          }
        }
      )}</div></div></div>`;
    }
  })}  ${activeJobs.length > 0 ? `${validate_component(Card, "Card").$$render($$result, {}, {}, {
    default: () => {
      return `<h2 class="text-lg font-semibold text-neutral-100 mb-3">⚡ Active Jobs (${escape(activeJobs.length)})</h2> <div class="space-y-2">${each(activeJobs, (job) => {
        return `<button class="w-full text-left bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3 hover:bg-neutral-800/70 transition-colors"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-3 flex-1 min-w-0"><span class="text-xl">${escape(getStatusIcon(job.status))}</span> <div class="flex-1 min-w-0"><div class="flex items-center gap-2 flex-wrap"><span class="font-medium text-sm text-neutral-100">${escape(job.kind)}</span> ${validate_component(Badge, "Badge").$$render(
          $$result,
          {
            variant: job.status === "running" ? "warning" : "secondary",
            size: "sm"
          },
          {},
          {
            default: () => {
              return `${escape(job.status)} `;
            }
          }
        )}</div> ${job.progress_total && job.progress_total > 0 ? `<div class="mt-2"><div class="flex items-center justify-between text-xs text-neutral-400 mb-1"><span data-svelte-h="svelte-16oy1pd">Progress</span> <span>${escape(job.progress_current || 0)}/${escape(job.progress_total)}</span></div> <div class="w-full bg-neutral-700/50 rounded-full h-1.5"><div class="bg-blue-500 h-1.5 rounded-full" style="${"width: " + escape(getProgressPercent(job) || 0, true) + "%"}"></div></div> </div>` : ``} </div></div> <div class="flex items-center gap-2"><span class="text-xs text-neutral-400 font-mono">${escape(formatDuration(job))}</span> <svg class="${"w-4 h-4 text-neutral-500 transition-transform " + escape(expandedJobId === job.job_id ? "rotate-180" : "", true)}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg> </div></div> ${expandedJobId === job.job_id ? `<div class="mt-3 pt-3 border-t border-neutral-700/30 space-y-2"><div><div class="text-xs font-semibold text-neutral-400 mb-1" data-svelte-h="svelte-1d8ifwo">Job ID</div> <div class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded break-all">${escape(job.job_id)}</div></div> ${job.payload ? `<div><div class="text-xs font-semibold text-neutral-400 mb-1" data-svelte-h="svelte-1tfs8so">Payload</div> <pre class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded overflow-x-auto">${escape(JSON.stringify(job.payload, null, 2))}</pre> </div>` : ``} ${job.progress_total ? `<div><div class="text-xs font-semibold text-neutral-400 mb-1" data-svelte-h="svelte-9yilb5">Progress</div> <div class="text-xs text-neutral-300">${escape(job.progress_current || 0)} / ${escape(job.progress_total)} (${escape(getProgressPercent(job) || 0)}%)</div> </div>` : ``} </div>` : ``} </button>`;
      })}</div>`;
    }
  })}` : ``}  ${completedJobs.length > 0 ? `${validate_component(Card, "Card").$$render($$result, {}, {}, {
    default: () => {
      return `<h2 class="text-lg font-semibold text-neutral-100 mb-3">✓ Completed Today (${escape(completedJobs.length)})</h2> <div class="space-y-2">${each(completedJobs.slice(0, 10), (job) => {
        return `<button class="w-full text-left bg-neutral-800/30 border border-neutral-700/30 rounded-lg p-3 hover:bg-neutral-800/50 transition-colors"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-3 flex-1 min-w-0"><span class="text-xl" data-svelte-h="svelte-jahl60">✓</span> <div class="flex-1 min-w-0"><div class="flex items-center gap-2 flex-wrap"><span class="font-medium text-sm text-neutral-100">${escape(job.kind)}</span> <span class="text-xs text-neutral-500">${escape(formatTime(job.started_at))}</span></div> ${job.result ? `<div class="text-xs text-neutral-500 mt-1">${typeof job.result === "object" ? `${escape(JSON.stringify(job.result).slice(0, 80))}...` : `${escape(job.result)}`} </div>` : ``} </div></div> <div class="flex items-center gap-2"><span class="text-xs text-neutral-400 font-mono">${escape(formatDuration(job))}</span> <svg class="${"w-4 h-4 text-neutral-500 transition-transform " + escape(expandedJobId === job.job_id ? "rotate-180" : "", true)}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg> </div></div> ${expandedJobId === job.job_id ? `<div class="mt-3 pt-3 border-t border-neutral-700/30 space-y-2"><div><div class="text-xs font-semibold text-neutral-400 mb-1" data-svelte-h="svelte-1d8ifwo">Job ID</div> <div class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded">${escape(job.job_id)}</div></div> ${job.result ? `<div><div class="text-xs font-semibold text-neutral-400 mb-1" data-svelte-h="svelte-uxvnfj">Result</div> <pre class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded overflow-x-auto">${escape(JSON.stringify(job.result, null, 2))}</pre> </div>` : ``} </div>` : ``} </button>`;
      })}</div>`;
    }
  })}` : ``}  ${failedJobs.length > 0 ? `${validate_component(Card, "Card").$$render($$result, {}, {}, {
    default: () => {
      return `<div class="flex items-center justify-between mb-3"><h2 class="text-lg font-semibold text-red-300">⚠️ Failed Jobs (${escape(failedJobs.length)})</h2> <div class="flex items-center gap-2">${validate_component(Button, "Button").$$render(
        $$result,
        {
          variant: "secondary",
          size: "sm",
          disabled: cleanupLoading
        },
        {},
        {
          default: () => {
            return `🧹 Cleanup`;
          }
        }
      )} <button ${""} class="px-3 py-1.5 text-sm rounded-lg bg-neutral-800 text-red-400 hover:text-red-300 hover:bg-neutral-700 disabled:opacity-50 transition-colors">🗑️ Reset All</button></div></div> <div class="space-y-2">${each(failedJobs, (job) => {
        return `<button class="w-full text-left bg-red-500/10 border border-red-500/20 rounded-lg p-3 hover:bg-red-500/20 transition-colors"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-3 flex-1 min-w-0"><span class="text-xl">${escape(getStatusIcon(job.status))}</span> <div class="flex-1 min-w-0"><div class="flex items-center gap-2 flex-wrap"><span class="font-medium text-sm text-red-300">${escape(job.kind)}</span> ${validate_component(Badge, "Badge").$$render($$result, { variant: "secondary", size: "sm" }, {}, {
          default: () => {
            return `${escape(job.status)}`;
          }
        })}</div> ${job.error ? `<div class="text-xs text-red-400 mt-1 line-clamp-1">${escape(job.error.slice(0, 100))}</div>` : ``} </div></div> <div class="flex items-center gap-2">${validate_component(Button, "Button").$$render(
          $$result,
          {
            variant: "primary",
            size: "sm",
            disabled: retryingJobId === job.job_id
          },
          {},
          {
            default: () => {
              return `${escape(retryingJobId === job.job_id ? "⟳" : "↻")} Retry
                `;
            }
          }
        )} <svg class="${"w-4 h-4 text-neutral-500 transition-transform " + escape(expandedJobId === job.job_id ? "rotate-180" : "", true)}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg> </div></div> ${expandedJobId === job.job_id ? `<div class="mt-3 pt-3 border-t border-neutral-700/30 space-y-2"><div><div class="text-xs font-semibold text-neutral-400 mb-1" data-svelte-h="svelte-1d8ifwo">Job ID</div> <div class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded">${escape(job.job_id)}</div></div> ${job.payload ? `<div><div class="text-xs font-semibold text-neutral-400 mb-1" data-svelte-h="svelte-1tfs8so">Payload</div> <pre class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded overflow-x-auto">${escape(JSON.stringify(job.payload, null, 2))}</pre> </div>` : ``} ${job.error ? `<div><div class="text-xs font-semibold text-red-400 mb-1" data-svelte-h="svelte-gma3u0">Error</div> <div class="text-xs text-red-300 bg-red-500/10 border border-red-500/20 p-2 rounded">${escape(job.error)}</div> </div>` : ``} </div>` : ``} </button>`;
      })}</div>`;
    }
  })}` : ``} ${jobs.length === 0 && !loading ? `${validate_component(Card, "Card").$$render($$result, { padding: "p-12" }, {}, {
    default: () => {
      return `<div class="text-center" data-svelte-h="svelte-13rppbc"><div class="text-4xl mb-3">📭</div> <p class="text-neutral-400">No jobs yet. Trigger an ingest above to get started.</p></div>`;
    }
  })}` : ``}</div>`;
});
export {
  Page as default
};

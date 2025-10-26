import { c as create_ssr_component, o as onDestroy, v as validate_component, e as escape, f as add_attribute, d as each } from "../../../../chunks/ssr.js";
import { C as Card, B as Button } from "../../../../chunks/Button.js";
import { I as Input } from "../../../../chunks/Input.js";
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
function getStatusVariant(status) {
  switch (status) {
    case "queued":
      return "secondary";
    case "running":
      return "warning";
    case "done":
      return "success";
    case "error":
      return "danger";
    case "timeout":
      return "danger";
    case "cancelled":
      return "secondary";
    default:
      return "secondary";
  }
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
  let queuedJobs;
  let runningJobs;
  let doneJobs;
  let errorJobs;
  let cleanedJobs;
  let jobs = [];
  let filteredJobs = [];
  let statusFilter = "all";
  let autoRefresh = true;
  let timer;
  let loading = false;
  let error = null;
  let newPricesTickers = "";
  let newMacroSeries = "";
  let newNewsQuery = "";
  let newNewsHours = 24;
  let actionLoading = false;
  let cleanupLoading = false;
  let expandedJobId = null;
  async function loadJobs() {
    loading = true;
    error = null;
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (statusFilter !== "all") ;
      const res = await apiGet(`/v1/ingest/jobs?${params.toString()}`);
      jobs = res.jobs || [];
      filterJobs();
    } catch (e) {
      error = e?.message || String(e);
    } finally {
      loading = false;
    }
  }
  function filterJobs() {
    {
      filteredJobs = jobs;
    }
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
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    {
      filterJobs();
    }
    {
      startAutoRefresh();
    }
    totalJobs = jobs.length;
    queuedJobs = jobs.filter((j) => j.status === "queued").length;
    runningJobs = jobs.filter((j) => j.status === "running").length;
    doneJobs = jobs.filter((j) => j.status === "done").length;
    errorJobs = jobs.filter((j) => j.status === "error").length;
    cleanedJobs = jobs.filter((j) => j.status === "timeout" || j.status === "cancelled").length;
    $$rendered = `<div class="max-w-7xl mx-auto space-y-6 h-full overflow-y-auto p-6"> <div class="flex items-center justify-between"><div data-svelte-h="svelte-1se048i"><h1 class="text-2xl font-bold text-neutral-100">Ingest Jobs</h1> <p class="text-sm text-neutral-400 mt-1">Real-time job monitoring and management</p></div> <div class="flex items-center gap-2">${validate_component(Badge, "Badge").$$render($$result, { variant: "secondary" }, {}, {
      default: () => {
        return `${escape(totalJobs)} total`;
      }
    })} ${queuedJobs > 0 ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "secondary" }, {}, {
      default: () => {
        return `${escape(queuedJobs)} queued`;
      }
    })}` : ``} ${runningJobs > 0 ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "warning" }, {}, {
      default: () => {
        return `${escape(runningJobs)} running`;
      }
    })}` : ``} ${doneJobs > 0 ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "success" }, {}, {
      default: () => {
        return `${escape(doneJobs)} done`;
      }
    })}` : ``} ${errorJobs > 0 ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "danger" }, {}, {
      default: () => {
        return `${escape(errorJobs)} errors`;
      }
    })}` : ``} ${cleanedJobs > 0 ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "secondary" }, {}, {
      default: () => {
        return `🧹 ${escape(cleanedJobs)} cleaned`;
      }
    })}` : ``}</div></div>  ${validate_component(Card, "Card").$$render($$result, {}, {}, {
      default: () => {
        return `<h2 class="text-lg font-semibold text-neutral-100 mb-4" data-svelte-h="svelte-ervdlk">Quick Actions</h2> <div class="grid grid-cols-1 md:grid-cols-3 gap-4"> <div class="space-y-2"><label class="text-sm font-medium text-neutral-300" data-svelte-h="svelte-gukm16">Prices (EOD)</label> <div class="flex gap-2">${validate_component(Input, "Input").$$render(
          $$result,
          {
            placeholder: "TSM, NVDA, AAPL",
            disabled: actionLoading,
            classes: "flex-1",
            value: newPricesTickers
          },
          {
            value: ($$value) => {
              newPricesTickers = $$value;
              $$settled = false;
            }
          },
          {}
        )} ${validate_component(Button, "Button").$$render(
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
        )}</div></div>  <div class="space-y-2"><label class="text-sm font-medium text-neutral-300" data-svelte-h="svelte-q29z5v">Macro (FRED)</label> <div class="flex gap-2">${validate_component(Input, "Input").$$render(
          $$result,
          {
            placeholder: "CPIAUCSL, GDP",
            disabled: actionLoading,
            classes: "flex-1",
            value: newMacroSeries
          },
          {
            value: ($$value) => {
              newMacroSeries = $$value;
              $$settled = false;
            }
          },
          {}
        )} ${validate_component(Button, "Button").$$render(
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
        )}</div></div>  <div class="space-y-2"><label class="text-sm font-medium text-neutral-300" data-svelte-h="svelte-1p7fwmh">News (GDELT)</label> <div class="flex gap-2">${validate_component(Input, "Input").$$render(
          $$result,
          {
            placeholder: "semiconductor",
            disabled: actionLoading,
            classes: "flex-1",
            value: newNewsQuery
          },
          {
            value: ($$value) => {
              newNewsQuery = $$value;
              $$settled = false;
            }
          },
          {}
        )} ${validate_component(Input, "Input").$$render(
          $$result,
          {
            type: "number",
            disabled: actionLoading,
            classes: "w-16",
            value: newNewsHours
          },
          {
            value: ($$value) => {
              newNewsHours = $$value;
              $$settled = false;
            }
          },
          {}
        )} ${validate_component(Button, "Button").$$render(
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
    })}  ${validate_component(Card, "Card").$$render($$result, {}, {}, {
      default: () => {
        return `<div class="flex items-center justify-between"><div class="flex items-center gap-4"><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" class="rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50"${add_attribute("checked", autoRefresh, 1)}> <span class="text-neutral-300">Auto-refresh (${escape(refreshInterval / 1e3)}s)</span></label> <div class="flex items-center gap-2"><span class="text-sm text-neutral-400" data-svelte-h="svelte-1hjo8jz">Filter:</span> <select class="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="all" data-svelte-h="svelte-421o1o">All</option><option value="queued" data-svelte-h="svelte-1m8b5yq">Queued</option><option value="running" data-svelte-h="svelte-zt8f5c">Running</option><option value="done" data-svelte-h="svelte-14rwhgu">Done</option><option value="error" data-svelte-h="svelte-82vi7i">Error</option><option value="timeout" data-svelte-h="svelte-15hyh9c">Timeout</option><option value="cancelled" data-svelte-h="svelte-u8k0fw">Cancelled</option></select></div></div> <div class="flex gap-2">${validate_component(Button, "Button").$$render(
          $$result,
          {
            variant: "secondary",
            size: "sm",
            loading: cleanupLoading
          },
          {},
          {
            default: () => {
              return `${escape("Cleanup Stuck Jobs")}`;
            }
          }
        )} ${validate_component(Button, "Button").$$render(
          $$result,
          {
            variant: "secondary",
            size: "sm",
            loading
          },
          {},
          {
            default: () => {
              return `${escape(loading ? "Refreshing..." : "Refresh Now")}`;
            }
          }
        )}</div></div>`;
      }
    })}  ${error ? `<div class="${escape(
      error.startsWith("✓") ? "bg-green-500/10 border-green-500/20 text-green-300" : "bg-red-500/10 border-red-500/20 text-red-300",
      true
    ) + " border rounded-lg p-3 text-sm"}">${escape(error)}</div>` : ``}  ${validate_component(Card, "Card").$$render($$result, { padding: "p-0" }, {}, {
      default: () => {
        return `<div class="divide-y divide-neutral-700/30">${filteredJobs.length === 0 ? `<div class="text-center py-12 text-neutral-500"><svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg> <p class="text-sm">${escape(
          "No jobs found"
        )}</p> <p class="text-xs text-neutral-600 mt-1" data-svelte-h="svelte-wv8qtc">Trigger a new ingest job above</p></div>` : `${each(filteredJobs, (job) => {
          return `<div class="${"p-4 hover:bg-neutral-800/30 transition-colors " + escape(
            job.status === "timeout" || job.status === "cancelled" ? "bg-orange-900/10 border-l-4 border-orange-500/40" : "",
            true
          )}"><button class="w-full text-left"><div class="flex items-start justify-between gap-4"><div class="flex-1 min-w-0"><div class="flex items-center gap-3 mb-2"><span class="text-2xl">${escape(getStatusIcon(job.status))}</span> <div class="flex-1"><div class="flex items-center gap-2"><span class="font-mono text-sm text-neutral-400">${escape(job.job_id.slice(0, 8))}...</span> ${validate_component(Badge, "Badge").$$render(
            $$result,
            {
              variant: getStatusVariant(job.status),
              size: "sm"
            },
            {},
            {
              default: () => {
                return `${escape(job.status)} `;
              }
            }
          )} ${job.status === "timeout" || job.status === "cancelled" ? `<span class="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded" data-svelte-h="svelte-1ia3nyx">🧹 Cleaned
                          </span>` : ``} <span class="text-sm text-neutral-300 font-medium">${escape(job.kind)}</span></div> ${job.payload ? `<div class="text-xs text-neutral-500 mt-1">${escape(JSON.stringify(job.payload).slice(0, 100))}...
                        </div>` : ``}</div> </div></div> <svg class="${"w-5 h-5 text-neutral-500 transition-transform " + escape(expandedJobId === job.job_id ? "rotate-180" : "", true)}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg> </div></button>  ${expandedJobId === job.job_id ? `<div class="mt-4 pt-4 border-t border-neutral-700/30 space-y-3"><div><div class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1" data-svelte-h="svelte-sxlhga">Full Job ID</div> <div class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-2 rounded">${escape(job.job_id)} </div></div> ${job.payload ? `<div><div class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1" data-svelte-h="svelte-14u6imz">Payload</div> <pre class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-3 rounded overflow-x-auto">${escape(JSON.stringify(job.payload, null, 2))}</pre> </div>` : ``} ${job.result ? `<div><div class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1" data-svelte-h="svelte-1yp6148">Result</div> <pre class="font-mono text-xs text-neutral-300 bg-neutral-900/50 p-3 rounded overflow-x-auto">${escape(JSON.stringify(job.result, null, 2))}</pre> </div>` : ``} ${job.error ? `<div><div class="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1" data-svelte-h="svelte-g2bfbz">Error</div> <div class="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded">${escape(job.error)}</div> </div>` : ``} </div>` : ``} </div>`;
        })}`}</div>`;
      }
    })}</div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};

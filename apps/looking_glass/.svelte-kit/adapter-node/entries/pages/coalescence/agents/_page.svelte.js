import { c as create_ssr_component, f as createEventDispatcher, e as escape, d as add_attribute, b as each, v as validate_component } from "../../../../chunks/ssr.js";
const AgentModal = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { agent = null } = $$props;
  let { isOpen = false } = $$props;
  let { availableRules = [] } = $$props;
  createEventDispatcher();
  let scheduleType = "manual";
  let intervalValue = 60;
  let intervalUnit = "minutes";
  let scheduledTime = "09:00";
  let customCron = "0 * * * *";
  let formData = {
    name: "",
    enabled: true,
    model: "haiku-3.5",
    schedule: "manual",
    system_prompt: "",
    turns: []
  };
  function initializeFormData() {
    if (!agent || !isOpen) return;
    let rulesContent = agent.config?.rules || "";
    if (!rulesContent && agent.config?.rules_file) {
      rulesContent = `# Rules laden aus: ${agent.config.rules_file}

(Rules werden aus File geladen - hier kannst du sie direkt bearbeiten)`;
    }
    formData = {
      name: agent.name || "",
      enabled: agent.config?.enabled ?? true,
      model: agent.config?.model || "haiku-3.5",
      schedule: agent.config?.schedule || "manual",
      timeout_minutes: agent.config?.timeout_minutes || 10,
      budget_daily_tokens: agent.config?.budget_daily_tokens || 5e3,
      system_prompt: agent.config?.system_prompt || "",
      turns: (agent.config?.turns || []).map((turn) => ({
        ...turn,
        mcps: turn.mcps || [],
        rules: turn.rules || []
      }))
      // Assuming rules are part of the turn config
    };
    parseSchedule(formData.schedule);
  }
  function initializeNewAgent() {
    if (agent || !isOpen) return;
    formData = {
      name: "",
      enabled: true,
      model: "haiku-3.5",
      schedule: "manual",
      timeout_minutes: 10,
      budget_daily_tokens: 5e3,
      system_prompt: "",
      turns: []
    };
    scheduleType = "manual";
  }
  function parseSchedule(schedule) {
    if (schedule === "manual") {
      scheduleType = "manual";
    } else if (schedule.startsWith("*/")) {
      scheduleType = "interval";
      const match = schedule.match(/\*\/(\d+)/);
      if (match) {
        intervalValue = parseInt(match[1]);
        intervalUnit = "minutes";
      }
    } else if (schedule.match(/^\d+ \d+ \* \* \*$/)) {
      scheduleType = "scheduled";
      const parts = schedule.split(" ");
      scheduledTime = `${parts[1].padStart(2, "0")}:${parts[0].padStart(2, "0")}`;
    } else {
      scheduleType = "cron";
      customCron = schedule;
    }
  }
  if ($$props.agent === void 0 && $$bindings.agent && agent !== void 0) $$bindings.agent(agent);
  if ($$props.isOpen === void 0 && $$bindings.isOpen && isOpen !== void 0) $$bindings.isOpen(isOpen);
  if ($$props.availableRules === void 0 && $$bindings.availableRules && availableRules !== void 0) $$bindings.availableRules(availableRules);
  {
    if (isOpen) {
      if (agent) {
        initializeFormData();
      } else {
        initializeNewAgent();
      }
    }
  }
  {
    initializeFormData();
  }
  formData.turns;
  return `${isOpen ? `<div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border-2 border-neutral-700 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"> <div class="flex items-center justify-between px-8 py-6 border-b border-neutral-700"><div><h2 class="text-2xl font-bold text-white flex items-center gap-3"><span class="text-3xl" data-svelte-h="svelte-1e519n8">⚙️</span> ${escape(agent ? agent.name : "Neuer Agent")}</h2> <p class="text-sm text-neutral-400 mt-1">${escape(agent ? "Agent konfigurieren und bearbeiten" : "Erstelle einen neuen Orchestrator-Agent")}</p></div> <button class="text-neutral-400 hover:text-white text-2xl transition-colors" data-svelte-h="svelte-uxmqhv">✕</button></div>  <div class="flex border-b border-neutral-700 px-8"><button${add_attribute(
    "class",
    `px-6 py-4 font-medium transition-all relative ${"text-blue-400"}`,
    0
  )}><span class="flex items-center gap-2" data-svelte-h="svelte-pr91yf"><span>⚡</span>
            Basis</span> ${`<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>`}</button> <button${add_attribute(
    "class",
    `px-6 py-4 font-medium transition-all relative ${"text-neutral-400 hover:text-neutral-200"}`,
    0
  )}><span class="flex items-center gap-2"><span data-svelte-h="svelte-54di3v">🔄</span>
            Turns
            ${formData.turns.length > 0 ? `<span class="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">${escape(formData.turns.length)}</span>` : ``}</span> ${``}</button> <button${add_attribute(
    "class",
    `px-6 py-4 font-medium transition-all relative ${"text-neutral-400 hover:text-neutral-200"}`,
    0
  )}><span class="flex items-center gap-2" data-svelte-h="svelte-nbtbur"><span>🔧</span>
            Erweitert</span> ${``}</button></div>  <div class="flex-1 overflow-y-auto px-8 py-6">${`<div class="space-y-6 max-w-3xl"> <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-6"><div class="grid grid-cols-2 gap-6"><div><label class="block text-sm font-semibold text-neutral-300 mb-3" data-svelte-h="svelte-1uhhnlz">Agent Name</label> <input type="text" placeholder="z.B. discovery, analyst_tech" class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" ${!!agent ? "disabled" : ""}${add_attribute("value", formData.name, 0)}> ${agent ? `<p class="text-xs text-neutral-500 mt-2" data-svelte-h="svelte-17jncex">Name kann nachträglich nicht geändert werden</p>` : ``}</div> <div><label class="block text-sm font-semibold text-neutral-300 mb-3" data-svelte-h="svelte-yd3z11">Status</label> <label class="flex items-center gap-3 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg cursor-pointer hover:border-blue-500/50 transition-all"><input type="checkbox" class="w-6 h-6 rounded border-neutral-600 text-green-600 focus:ring-2 focus:ring-green-500/20"${add_attribute("checked", formData.enabled, 1)}> <div class="flex-1"><div class="font-semibold text-white">${escape(formData.enabled ? "Aktiviert" : "Deaktiviert")}</div> <div class="text-xs text-neutral-400">Agent ist ${escape(formData.enabled ? "aktiv und läuft automatisch" : "inaktiv")}</div></div></label></div></div></div>  <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-6"><label class="block text-sm font-semibold text-neutral-300 mb-3" data-svelte-h="svelte-wzhbyk">KI Model</label> <div class="grid grid-cols-2 gap-3">${each(
    [
      {
        value: "haiku-3.5",
        label: "Haiku 3.5",
        desc: "Schnell & günstig",
        icon: "⚡"
      },
      {
        value: "haiku-4.5",
        label: "Haiku 4.5",
        desc: "Verbessert & schnell",
        icon: "🚀"
      },
      {
        value: "sonnet-4.5",
        label: "Sonnet 4.5",
        desc: "Balanced Performance",
        icon: "🎯"
      },
      {
        value: "opus-4.1",
        label: "Opus 4.1",
        desc: "Höchste Qualität",
        icon: "💎"
      }
    ],
    (model) => {
      return `<label class="${"flex items-center gap-3 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg cursor-pointer hover:border-blue-500/50 transition-all " + escape(
        formData.model === model.value ? "border-blue-500 bg-blue-900/20" : "",
        true
      )}"><input type="radio"${add_attribute("value", model.value, 0)} class="w-4 h-4"${model.value === formData.model ? add_attribute("checked", true, 1) : ""}> <div class="flex-1"><div class="font-semibold text-white flex items-center gap-2"><span>${escape(model.icon)}</span> ${escape(model.label)}</div> <div class="text-xs text-neutral-400">${escape(model.desc)}</div></div> </label>`;
    }
  )}</div></div>  <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-6"><label class="block text-sm font-semibold text-neutral-300 mb-3" data-svelte-h="svelte-1t9tyvm">Schedule / Ausführung</label> <div class="space-y-4"><div class="flex gap-3">${each(
    [
      {
        value: "manual",
        label: "Manuell",
        icon: "✋"
      },
      {
        value: "interval",
        label: "Intervall",
        icon: "⏱️"
      },
      {
        value: "scheduled",
        label: "Geplant",
        icon: "📅"
      },
      { value: "cron", label: "Cron", icon: "⚙️" }
    ],
    (type) => {
      return `<button class="${"flex-1 px-4 py-3 rounded-lg font-medium transition-all " + escape(
        scheduleType === type.value ? "bg-blue-600 text-white" : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-700",
        true
      )}"><span class="mr-2">${escape(type.icon)}</span> ${escape(type.label)} </button>`;
    }
  )}</div> ${scheduleType === "manual" ? `<div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300" data-svelte-h="svelte-9t5rb4">ℹ️ Agent wird nur manuell über den &quot;Run&quot;-Button gestartet</div>` : `${scheduleType === "interval" ? `<div class="flex gap-3"><input type="number" min="1" class="flex-1 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="60"${add_attribute("value", intervalValue, 0)}> <select class="px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"><option value="minutes" data-svelte-h="svelte-1a5vy0h">Minuten</option><option value="hours" data-svelte-h="svelte-pc59fc">Stunden</option></select></div> <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300">⏱️ Agent läuft alle ${escape(intervalValue)} ${escape(intervalUnit === "hours" ? "Stunden" : "Minuten")}</div>` : `${scheduleType === "scheduled" ? `<input type="time" class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500"${add_attribute("value", scheduledTime, 0)}> <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300">📅 Agent läuft täglich um ${escape(scheduledTime)} Uhr</div>` : `<input type="text" placeholder="0 * * * *" class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"${add_attribute("value", customCron, 0)}> <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300">⚙️ Cron Expression: <code class="font-mono text-blue-400">${escape(customCron)}</code></div>`}`}`}</div></div>  <div class="bg-neutral-900/30 border border-neutral-700/50 rounded-xl p-6"><label class="block text-sm font-semibold text-neutral-300 mb-3" data-svelte-h="svelte-ypk4du">System Prompt</label> <textarea${add_attribute("rows", 6, 0)} placeholder="System-Anweisungen für den Agent...

Beispiel:
Du bist ein Agent, der Märkte analysiert. Deine Aufgabe ist es, Signale zu finden und in Thoughts zu speichern." class="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">${escape(formData.system_prompt || "")}</textarea></div></div>`}</div>  <div class="flex items-center justify-between px-8 py-6 border-t border-neutral-700 bg-neutral-900/50"><div class="text-sm text-neutral-400">${`Schritt 1 von 3: Basis-Konfiguration`}</div> <div class="flex items-center gap-3"><button class="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors" data-svelte-h="svelte-9qme32">Abbrechen</button> <button class="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg font-medium shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-2" data-svelte-h="svelte-rcq1jo"><span>💾</span>
            Speichern</button></div></div></div></div>` : ``}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let agents = [];
  let availableRules = [];
  let showModal = false;
  let selectedAgent = null;
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<div class="flex-1 overflow-auto px-8 pb-8"> <div class="flex items-center justify-between mb-8"><div data-svelte-h="svelte-117ocgd"><h1 class="text-3xl font-bold text-white flex items-center gap-3 mb-2"><span class="text-4xl">⚙️</span>
        Agents</h1> <p class="text-neutral-400">Verwalte und konfiguriere deine Orchestrator-Agents</p></div> <div class="flex items-center gap-3"><div class="flex bg-neutral-800 border border-neutral-700 rounded-lg p-1"><button${add_attribute(
      "class",
      `px-4 py-2 rounded text-sm font-medium transition-all ${"bg-blue-600 text-white shadow-lg"}`,
      0
    )}>📊 Karten</button> <button${add_attribute(
      "class",
      `px-4 py-2 rounded text-sm font-medium transition-all ${"text-neutral-400 hover:text-neutral-200"}`,
      0
    )}>📝 YAML</button></div> <button class="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all font-medium flex items-center gap-2" data-svelte-h="svelte-1m3hbgs"><span class="text-lg">➕</span>
        Neuer Agent</button></div></div>  ${``} ${``} ${agents.length === 0 ? `<div class="flex items-center justify-center h-96" data-svelte-h="svelte-d8t19p"><div class="text-center"><div class="inline-block animate-spin text-5xl mb-4">⚙️</div> <div class="text-xl text-neutral-400 font-medium">Agents werden geladen...</div></div></div>` : `${` ${agents.length === 0 ? `<div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-16 text-center"><div class="text-6xl mb-4 opacity-30" data-svelte-h="svelte-o9qygu">🤖</div> <div class="text-2xl text-neutral-400 mb-4" data-svelte-h="svelte-1fl3jok">Keine Agents konfiguriert</div> <button class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors inline-flex items-center gap-2" data-svelte-h="svelte-1sjd9l5"><span>➕</span>
          Ersten Agent erstellen</button></div>` : `<div class="grid grid-cols-3 gap-6">${each(agents, (agent) => {
      return `<div class="group relative bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-500/50 hover:scale-[1.02] transition-all duration-300"> <div class="${"absolute top-4 right-4 w-3 h-3 rounded-full " + escape(
        agent.config?.enabled ? "bg-green-500 shadow-lg shadow-green-500/50 animate-pulse" : "bg-neutral-500",
        true
      )}"></div> <div class="mb-5"><h3 class="font-bold text-2xl mb-2 text-white group-hover:text-blue-400 transition-colors">${escape(agent.name)}</h3> <div class="${"inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full " + escape(
        agent.config?.enabled ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-neutral-700 text-neutral-400 border border-neutral-600",
        true
      )}"><span class="${"w-1.5 h-1.5 rounded-full " + escape(
        agent.config?.enabled ? "bg-green-400" : "bg-neutral-400",
        true
      )}"></span> ${escape(agent.config?.enabled ? "Aktiv" : "Inaktiv")} </div></div> <div class="space-y-3 mb-5"><div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50"><div class="text-xs font-medium text-neutral-400 uppercase tracking-wide" data-svelte-h="svelte-14cltl5">Model</div> <div class="text-sm font-semibold text-white">${escape(agent.config?.model || "N/A")}</div></div> <div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50"><div class="text-xs font-medium text-neutral-400 uppercase tracking-wide" data-svelte-h="svelte-tur07x">Schedule</div> <div class="text-xs font-mono text-white">${escape(agent.config?.schedule || "N/A")}</div></div> <div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50"><div class="text-xs font-medium text-neutral-400 uppercase tracking-wide" data-svelte-h="svelte-1ihuqjm">Turns</div> <div class="text-sm font-semibold text-blue-400">${escape(agent.config?.turns?.length || 0)}</div></div> ${agent.stats ? `<div class="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50"><div class="text-xs font-medium text-neutral-400 uppercase tracking-wide" data-svelte-h="svelte-jtd63o">Total Runs</div> <div class="text-sm font-semibold text-purple-400">${escape(agent.stats.total_runs || 0)}</div> </div>` : ``}</div> <div class="flex gap-2"><button class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2" data-svelte-h="svelte-9k9bad"><span>✏️</span>
                Bearbeiten</button> <button class="${"px-4 py-2 " + escape(
        agent.config?.enabled ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700",
        true
      ) + " rounded-lg text-sm font-medium transition-colors"}">${escape(agent.config?.enabled ? "⏸️" : "▶️")} </button></div> </div>`;
    })}</div>`}`}`}</div>  ${validate_component(AgentModal, "AgentModal").$$render(
      $$result,
      {
        agent: selectedAgent,
        availableRules,
        isOpen: showModal
      },
      {
        isOpen: ($$value) => {
          showModal = $$value;
          $$settled = false;
        }
      },
      {}
    )}`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};

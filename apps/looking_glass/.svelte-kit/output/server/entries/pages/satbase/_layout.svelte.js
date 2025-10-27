import { c as create_ssr_component, a as subscribe, b as each, d as add_attribute, e as escape, v as validate_component } from "../../../chunks/ssr.js";
import { p as page } from "../../../chunks/stores.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
function isActive(href, path) {
  return path === href;
}
const SatbaseNav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let currentPath;
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  const sections = [
    {
      label: "Overview",
      href: "/satbase/overview",
      icon: "📊",
      key: "overview"
    },
    {
      label: "Topics",
      href: "/satbase/topics",
      icon: "📋",
      key: "topics"
    },
    {
      label: "News",
      href: "/satbase/news",
      icon: "📰",
      key: "news"
    },
    {
      label: "Watchlist",
      href: "/satbase/watchlist",
      icon: "📈",
      key: "watchlist"
    },
    {
      label: "Prices",
      href: "/satbase/prices",
      icon: "💹",
      key: "prices"
    },
    {
      label: "Macro",
      href: "/satbase/macro",
      icon: "📊",
      key: "macro"
    },
    {
      label: "Jobs",
      href: "/satbase/jobs",
      icon: "🔧",
      key: "jobs"
    }
  ];
  currentPath = $page.url.pathname;
  $$unsubscribe_page();
  return `<nav class="relative flex border-b-2 border-neutral-700/50 mb-6 gap-2">${each(sections, (section) => {
    return `<a${add_attribute("href", section.href, 0)}${add_attribute(
      "class",
      `relative px-5 py-3 font-medium transition-all duration-200 flex items-center gap-2 group ${isActive(section.href, currentPath) ? "text-emerald-400" : "text-neutral-400 hover:text-neutral-200"}`,
      0
    )}><span class="text-xl transition-transform group-hover:scale-110">${escape(section.icon)}</span> <span>${escape(section.label)}</span> ${isActive(section.href, currentPath) ? `<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-500 shadow-lg shadow-emerald-500/50"></div>` : ``} ${!isActive(section.href, currentPath) ? `<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neutral-600 to-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>` : ``} </a>`;
  })}</nav>`;
});
const css = {
  code: ":root{--color-primary:rgb(16, 185, 129);--color-primary-light:rgb(209, 250, 229);--color-accent:rgb(34, 197, 211);--color-accent-light:rgb(165, 243, 252);--color-bg-dark:rgb(15, 23, 42);--color-bg-darker:rgb(2, 6, 23);--color-bg-card:rgba(51, 65, 85, 0.5);--color-border:rgb(71, 85, 105);--color-border-light:rgb(148, 163, 184);--color-text:rgb(248, 250, 252);--color-text-secondary:rgb(148, 163, 184);--color-text-tertiary:rgb(100, 116, 139);--color-success:rgb(34, 197, 211);--color-warning:rgb(251, 146, 60);--color-error:rgb(239, 68, 68);--radius-sm:0.375rem;--radius-md:0.5rem;--radius-lg:0.75rem;--radius-xl:1rem;--shadow-sm:0 1px 2px 0 rgba(0, 0, 0, 0.05);--shadow-md:0 4px 6px -1px rgba(0, 0, 0, 0.1);--shadow-lg:0 10px 15px -3px rgba(0, 0, 0, 0.1);--shadow-xl:0 20px 25px -5px rgba(0, 0, 0, 0.1);--duration-75:75ms;--duration-100:100ms;--duration-200:200ms;--duration-300:300ms;--duration-500:500ms;--easing:cubic-bezier(0.4, 0, 0.2, 1)}.satbase-layout.svelte-1tgfji7{position:relative;height:100vh;background:linear-gradient(to bottom, rgb(15, 23, 42), rgb(2, 6, 23));overflow:hidden;display:flex;flex-direction:column}.background-gradient.svelte-1tgfji7{position:fixed;inset:0;background:radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%),\n			radial-gradient(circle at 80% 80%, rgba(34, 197, 211, 0.03) 0%, transparent 50%);pointer-events:none;z-index:0}main.satbase-main{position:relative;z-index:1;flex:1;overflow-y:auto;overflow-x:hidden;padding-top:1rem;padding-bottom:2rem}.container.svelte-1tgfji7{max-width:90rem;margin:0 auto;padding:0 1.5rem}@media(max-width: 768px){.container.svelte-1tgfji7{padding:0 1rem}}",
  map: '{"version":3,"file":"+layout.svelte","sources":["+layout.svelte"],"sourcesContent":["<script lang=\\"ts\\">import SatbaseNav from \\"$lib/components/satbase/SatbaseNav.svelte\\";\\nimport { page } from \\"$app/stores\\";\\n<\/script>\\n\\n<div class=\\"satbase-layout\\">\\n\\t<!-- Global Background -->\\n\\t<div class=\\"background-gradient\\" />\\n\\t\\n\\t<!-- Navigation -->\\n\\t<SatbaseNav />\\n\\t\\n\\t<!-- Main Content -->\\n\\t<main class=\\"satbase-main\\">\\n\\t\\t<div class=\\"container\\">\\n\\t\\t\\t<slot />\\n\\t\\t</div>\\n\\t</main>\\n</div>\\n\\n<style>\\n\\t:global(:root) {\\n\\t\\t/* Colors */\\n\\t\\t--color-primary: rgb(16, 185, 129); /* emerald-500 */\\n\\t\\t--color-primary-light: rgb(209, 250, 229); /* emerald-100 */\\n\\t\\t--color-accent: rgb(34, 197, 211); /* cyan-500 */\\n\\t\\t--color-accent-light: rgb(165, 243, 252); /* cyan-100 */\\n\\t\\t\\n\\t\\t--color-bg-dark: rgb(15, 23, 42); /* slate-950 */\\n\\t\\t--color-bg-darker: rgb(2, 6, 23); /* slate-990 custom */\\n\\t\\t--color-bg-card: rgba(51, 65, 85, 0.5); /* slate-700/50 */\\n\\t\\t--color-border: rgb(71, 85, 105); /* slate-600 */\\n\\t\\t--color-border-light: rgb(148, 163, 184); /* slate-400 */\\n\\t\\t\\n\\t\\t--color-text: rgb(248, 250, 252); /* slate-50 */\\n\\t\\t--color-text-secondary: rgb(148, 163, 184); /* slate-400 */\\n\\t\\t--color-text-tertiary: rgb(100, 116, 139); /* slate-500 */\\n\\t\\t\\n\\t\\t/* Status Colors */\\n\\t\\t--color-success: rgb(34, 197, 211); /* cyan-500 */\\n\\t\\t--color-warning: rgb(251, 146, 60); /* orange-500 */\\n\\t\\t--color-error: rgb(239, 68, 68); /* red-500 */\\n\\t\\t\\n\\t\\t/* Spacing & Sizing */\\n\\t\\t--radius-sm: 0.375rem;\\n\\t\\t--radius-md: 0.5rem;\\n\\t\\t--radius-lg: 0.75rem;\\n\\t\\t--radius-xl: 1rem;\\n\\t\\t\\n\\t\\t--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);\\n\\t\\t--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);\\n\\t\\t--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);\\n\\t\\t--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);\\n\\t\\t\\n\\t\\t/* Transitions */\\n\\t\\t--duration-75: 75ms;\\n\\t\\t--duration-100: 100ms;\\n\\t\\t--duration-200: 200ms;\\n\\t\\t--duration-300: 300ms;\\n\\t\\t--duration-500: 500ms;\\n\\t\\t--easing: cubic-bezier(0.4, 0, 0.2, 1);\\n\\t}\\n\\n\\t.satbase-layout {\\n\\t\\tposition: relative;\\n\\t\\theight: 100vh;\\n\\t\\tbackground: linear-gradient(to bottom, rgb(15, 23, 42), rgb(2, 6, 23));\\n\\t\\toverflow: hidden;\\n\\t\\tdisplay: flex;\\n\\t\\tflex-direction: column;\\n\\t}\\n\\n\\t.background-gradient {\\n\\t\\tposition: fixed;\\n\\t\\tinset: 0;\\n\\t\\tbackground: \\n\\t\\t\\tradial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%),\\n\\t\\t\\tradial-gradient(circle at 80% 80%, rgba(34, 197, 211, 0.03) 0%, transparent 50%);\\n\\t\\tpointer-events: none;\\n\\t\\tz-index: 0;\\n\\t}\\n\\n\\t:global(main.satbase-main) {\\n\\t\\tposition: relative;\\n\\t\\tz-index: 1;\\n\\t\\tflex: 1;\\n\\t\\toverflow-y: auto;\\n\\t\\toverflow-x: hidden;\\n\\t\\tpadding-top: 1rem;\\n\\t\\tpadding-bottom: 2rem;\\n\\t}\\n\\n\\t.container {\\n\\t\\tmax-width: 90rem; /* 1440px */\\n\\t\\tmargin: 0 auto;\\n\\t\\tpadding: 0 1.5rem;\\n\\t}\\n\\n\\t@media (max-width: 768px) {\\n\\t\\t.container {\\n\\t\\t\\tpadding: 0 1rem;\\n\\t\\t}\\n\\t}\\n</style>\\n"],"names":[],"mappings":"AAoBS,KAAO,CAEd,eAAe,CAAE,iBAAiB,CAClC,qBAAqB,CAAE,kBAAkB,CACzC,cAAc,CAAE,iBAAiB,CACjC,oBAAoB,CAAE,kBAAkB,CAExC,eAAe,CAAE,eAAe,CAChC,iBAAiB,CAAE,aAAa,CAChC,eAAe,CAAE,qBAAqB,CACtC,cAAc,CAAE,gBAAgB,CAChC,oBAAoB,CAAE,kBAAkB,CAExC,YAAY,CAAE,kBAAkB,CAChC,sBAAsB,CAAE,kBAAkB,CAC1C,qBAAqB,CAAE,kBAAkB,CAGzC,eAAe,CAAE,iBAAiB,CAClC,eAAe,CAAE,iBAAiB,CAClC,aAAa,CAAE,gBAAgB,CAG/B,WAAW,CAAE,QAAQ,CACrB,WAAW,CAAE,MAAM,CACnB,WAAW,CAAE,OAAO,CACpB,WAAW,CAAE,IAAI,CAEjB,WAAW,CAAE,+BAA+B,CAC5C,WAAW,CAAE,iCAAiC,CAC9C,WAAW,CAAE,mCAAmC,CAChD,WAAW,CAAE,mCAAmC,CAGhD,aAAa,CAAE,IAAI,CACnB,cAAc,CAAE,KAAK,CACrB,cAAc,CAAE,KAAK,CACrB,cAAc,CAAE,KAAK,CACrB,cAAc,CAAE,KAAK,CACrB,QAAQ,CAAE,4BACX,CAEA,8BAAgB,CACf,QAAQ,CAAE,QAAQ,CAClB,MAAM,CAAE,KAAK,CACb,UAAU,CAAE,gBAAgB,EAAE,CAAC,MAAM,CAAC,CAAC,IAAI,EAAE,CAAC,CAAC,EAAE,CAAC,CAAC,EAAE,CAAC,CAAC,CAAC,IAAI,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAAC,CACtE,QAAQ,CAAE,MAAM,CAChB,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MACjB,CAEA,mCAAqB,CACpB,QAAQ,CAAE,KAAK,CACf,KAAK,CAAE,CAAC,CACR,UAAU,CACT,gBAAgB,MAAM,CAAC,EAAE,CAAC,GAAG,CAAC,GAAG,CAAC,CAAC,KAAK,EAAE,CAAC,CAAC,GAAG,CAAC,CAAC,GAAG,CAAC,CAAC,IAAI,CAAC,CAAC,EAAE,CAAC,CAAC,WAAW,CAAC,GAAG,CAAC;AACnF,GAAG,gBAAgB,MAAM,CAAC,EAAE,CAAC,GAAG,CAAC,GAAG,CAAC,CAAC,KAAK,EAAE,CAAC,CAAC,GAAG,CAAC,CAAC,GAAG,CAAC,CAAC,IAAI,CAAC,CAAC,EAAE,CAAC,CAAC,WAAW,CAAC,GAAG,CAAC,CACjF,cAAc,CAAE,IAAI,CACpB,OAAO,CAAE,CACV,CAEQ,iBAAmB,CAC1B,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,CAAC,CACV,IAAI,CAAE,CAAC,CACP,UAAU,CAAE,IAAI,CAChB,UAAU,CAAE,MAAM,CAClB,WAAW,CAAE,IAAI,CACjB,cAAc,CAAE,IACjB,CAEA,yBAAW,CACV,SAAS,CAAE,KAAK,CAChB,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,CAAC,CAAC,MACZ,CAEA,MAAO,YAAY,KAAK,CAAE,CACzB,yBAAW,CACV,OAAO,CAAE,CAAC,CAAC,IACZ,CACD"}'
};
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css);
  return `<div class="satbase-layout svelte-1tgfji7"> <div class="background-gradient svelte-1tgfji7"></div>  ${validate_component(SatbaseNav, "SatbaseNav").$$render($$result, {}, {}, {})}  <main class="satbase-main"><div class="container svelte-1tgfji7">${slots.default ? slots.default({}) : ``}</div></main> </div>`;
});
export {
  Layout as default
};

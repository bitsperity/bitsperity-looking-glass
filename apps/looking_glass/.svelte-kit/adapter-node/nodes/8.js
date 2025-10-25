

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/ariadne/graph/_page.svelte.js')).default;
export const universal = {
  "ssr": false
};
export const universal_id = "src/routes/ariadne/graph/+page.ts";
export const imports = ["_app/immutable/nodes/8.CQhWMR5l.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/DnBpi1Qd.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/DhtULb7M.js","_app/immutable/chunks/DpLN_ZxB.js","_app/immutable/chunks/BK-2Zo4i.js","_app/immutable/chunks/B-X8W3ki.js"];
export const stylesheets = [];
export const fonts = [];

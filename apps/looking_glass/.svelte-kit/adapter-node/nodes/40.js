

export const index = 40;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/satbase/prices/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/40.BTKNpHhx.js","_app/immutable/chunks/DnBpi1Qd.js","_app/immutable/chunks/B5jFdsvg.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/BfpXyNPu.js","_app/immutable/chunks/BuVrwsH3.js"];
export const stylesheets = [];
export const fonts = [];

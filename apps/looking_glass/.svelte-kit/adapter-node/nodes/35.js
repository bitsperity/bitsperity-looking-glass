

export const index = 35;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/satbase/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/35.D2XYLGrI.js","_app/immutable/chunks/DnBpi1Qd.js","_app/immutable/chunks/IHki7fMi.js"];
export const stylesheets = [];
export const fonts = [];

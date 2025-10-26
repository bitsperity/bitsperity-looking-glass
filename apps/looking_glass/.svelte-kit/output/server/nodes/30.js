

export const index = 30;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/manifold/graph/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/manifold/graph/+page.ts";
export const imports = ["_app/immutable/nodes/30.Cn9b8B5f.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/CBgra1dj.js","_app/immutable/chunks/DSV69tWQ.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/UxnmsV0t.js","_app/immutable/chunks/B3k6ZiG1.js","_app/immutable/chunks/holhRAZM.js","_app/immutable/chunks/Ckl4Ubk8.js","_app/immutable/chunks/D0iwhpLH.js","_app/immutable/chunks/B8XHBHBb.js","_app/immutable/chunks/BMfUzoXz.js"];
export const stylesheets = ["_app/immutable/assets/ThoughtPreviewModal.Bh1OKVEN.css"];
export const fonts = [];

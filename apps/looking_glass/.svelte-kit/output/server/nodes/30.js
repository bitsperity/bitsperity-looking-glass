

export const index = 30;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/manifold/graph/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/manifold/graph/+page.ts";
export const imports = ["_app/immutable/nodes/30.lE_2nD69.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/BeOz57Dq.js","_app/immutable/chunks/D_ZdN6Q8.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/UxnmsV0t.js","_app/immutable/chunks/il2daQFk.js","_app/immutable/chunks/B-cyMrXP.js","_app/immutable/chunks/D98msYD6.js","_app/immutable/chunks/D0iwhpLH.js","_app/immutable/chunks/CH46InRZ.js","_app/immutable/chunks/BGU6Zfga.js"];
export const stylesheets = ["_app/immutable/assets/ThoughtPreviewModal.Bh1OKVEN.css"];
export const fonts = [];

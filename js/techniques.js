// Every practice page and the config it runs. Used by the history page to find a
// technique's config for its animated thumbnail. tests/site.test.js keeps it complete.
export const TECHNIQUES = {
  'box-breathing.html': 'box.js',
  'resonance-breathing.html': 'resonance.js',
  '478-breathing.html': '478.js',
  'physiological-sigh.html': 'sigh.js',
  'extended-exhale.html': 'extended-exhale.js',
  'triangle-breathing.html': 'triangle.js',
  'pursed-lip-breathing.html': 'pursed-lip.js',
  'bhramari.html': 'bhramari.js',
  'bhastrika.html': 'bhastrika.js',
  'kapalabhati.html': 'kapalabhati.js',
  'wim-hof.html': 'wim-hof.js',
  'tummo.html': 'tummo.js',
  'connected-breathing.html': 'holotropic.js',
  'buteyko.html': 'buteyko.js',
  'alternate-nostril.html': 'alternate-nostril.js',
};

export async function loadConfig(page) {
  const file = TECHNIQUES[page];
  if (!file) return null;
  const mod = await import(`../configs/${file}`);
  return mod.default;
}

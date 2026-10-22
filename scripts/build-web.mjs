// Copies the static site into www/, the web bundle Capacitor ships inside the apps.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'www');

rmSync(out, { recursive: true, force: true });
mkdirSync(out);

for (const file of readdirSync(root)) {
  if (file.endsWith('.html') && !file.startsWith('_tmp-')) cpSync(join(root, file), join(out, file));
}
for (const dir of ['css', 'js', 'configs']) {
  cpSync(join(root, dir), join(out, dir), { recursive: true });
}

console.log(`Built ${out}`);

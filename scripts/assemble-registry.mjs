/**
 * Build the store plugins and assemble the content for the `orbit-plugins`
 * GitHub repo: a registry.json plus one folder per plugin (main.js + manifest.json).
 *
 *   node scripts/assemble-registry.mjs
 *   → plugins-dist/registry/            (copy its contents into the repo root)
 *
 * The app's default source points at that repo's registry.json; `main` paths are
 * relative, so they resolve against the raw registry.json URL on GitHub.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGINS = ['skwd-wall'];
const outDir = resolve(root, 'plugins-dist/registry');

// Minimal runtime shim so we can import a built plugin and read its manifest
// without a browser (modules only define classes + the manifest at top level).
globalThis.Orbit = {
  Plugin: class {},
  View: class {},
  Store: class { constructor(v) { this.v = v; } get() { return this.v; } set() {} update() {} subscribe() { return () => {}; } },
  MapStore: class { get() { return {}; } subscribe() { return () => {}; } },
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const registry = [];
for (const id of PLUGINS) {
  console.log(`\n▸ building ${id}`);
  execSync(`PLUGIN=${id} npm run build:plugin`, { cwd: root, stdio: 'inherit' });

  const built = resolve(root, `plugins-dist/${id}/main.js`);
  const mod = await import(pathToFileURL(built).href + `?t=${Date.now()}`);
  const m = mod.manifest ?? {};

  const pluginDir = resolve(outDir, id);
  mkdirSync(pluginDir, { recursive: true });
  copyFileSync(built, resolve(pluginDir, 'main.js'));

  const manifest = { ...m, main: 'main.js' };
  writeFileSync(resolve(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  registry.push({
    id: m.id,
    name: m.name,
    description: m.description,
    author: m.author,
    version: m.version,
    type: m.type,
    platforms: m.platforms,
    capabilities: m.capabilities,
    screenshots: m.screenshots,
    repo: m.repo,
    homepage: m.homepage,
    main: `${id}/main.js`,
  });
}

writeFileSync(resolve(outDir, 'registry.json'), JSON.stringify({ plugins: registry }, null, 2));
console.log(`\n✓ assembled ${registry.length} plugins → ${outDir}`);
console.log('  Copy its contents into the orbit-plugins repo root and push.');

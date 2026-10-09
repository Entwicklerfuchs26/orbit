/**
 * Build the store plugins and publish them to the orbit-plugins repo with
 * IMMUTABLE, commit-SHA-pinned URLs — so every published build reaches apps
 * deterministically (GitHub raw/CDN caches an immutable path forever and never
 * serves a stale one), and old versions stay installable for rollback.
 *
 *   node scripts/publish-plugins.mjs <clone-dir-of-orbit-plugins>
 *
 * Flow: build → copy into the clone → commit plugin files → read their SHA →
 * write registry.json pinning `main` to that SHA + append to each plugin's
 * version history → commit + push.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clone = process.argv[2];
if (!clone) throw new Error('Usage: node scripts/publish-plugins.mjs <clone-dir>');

const REPO = 'Entwicklerfuchs26/orbit-plugins';
const PLUGINS = ['skwd-wall'];
const MAX_HISTORY = 12;

// Shim so we can import a built plugin and read its manifest in Node.
globalThis.Orbit = {
  Plugin: class {},
  View: class {},
  Store: class { constructor(v) { this.v = v; } get() { return this.v; } set() {} update() {} subscribe() { return () => {}; } },
  MapStore: class { get() { return {}; } subscribe() { return () => {}; } },
};

const git = (args) => execSync(`git -C "${clone}" ${args}`, { encoding: 'utf8' }).trim();

// Build + copy each plugin into the clone.
const manifests = {};
for (const id of PLUGINS) {
  console.log(`\n▸ building ${id}`);
  execSync(`PLUGIN=${id} npm run build:plugin`, { cwd: root, stdio: 'inherit' });
  const built = resolve(root, `plugins-dist/${id}/main.js`);
  const mod = await import(pathToFileURL(built).href + `?t=${Date.now()}`);
  manifests[id] = mod.manifest ?? {};
  const dir = resolve(clone, id);
  mkdirSync(dir, { recursive: true });
  copyFileSync(built, resolve(dir, 'main.js'));
  writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify({ ...manifests[id], main: 'main.js' }, null, 2));
}

// Commit the plugin files first so they get an immutable SHA.
git('add -A');
try {
  git('-c user.name="Entwicklerfuchs26" -c user.email="jonas@hofpause.info" commit -q -m "build: plugin bundles"');
} catch {
  console.log('(no plugin changes to commit)');
}
const sha = git('rev-parse HEAD');
const sha7 = sha.slice(0, 7);
console.log(`\npinned to ${sha7}`);

// Read the previous registry for version history.
const regPath = resolve(clone, 'registry.json');
let prev = {};
if (existsSync(regPath)) {
  try {
    const parsed = JSON.parse(readFileSync(regPath, 'utf8'));
    for (const e of parsed.plugins ?? []) prev[e.id] = e;
  } catch {}
}

const rawBase = `https://raw.githubusercontent.com/${REPO}`;
const registry = PLUGINS.map((id) => {
  const m = manifests[id];
  const main = `${rawBase}/${sha}/${id}/main.js`;
  const history = Array.isArray(prev[id]?.versions) ? prev[id].versions : [];
  const label = `${m.version ?? '0.0.0'}+${sha7}`;
  const versions =
    history[0]?.main === main ? history : [{ label, version: m.version, built: sha7, main }, ...history].slice(0, MAX_HISTORY);
  return {
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
    news: m.news,
    main,
    versions,
  };
});

writeFileSync(regPath, JSON.stringify({ plugins: registry }, null, 2));
git('add registry.json');
try {
  git(`-c user.name="Entwicklerfuchs26" -c user.email="jonas@hofpause.info" commit -q -m "registry: pin ${sha7}"`);
} catch {
  console.log('(registry unchanged)');
}
git('push -q origin main');
console.log(`\n✓ published ${registry.length} plugins @ ${sha7}`);

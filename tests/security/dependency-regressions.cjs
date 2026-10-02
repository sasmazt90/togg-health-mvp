/* Bounded checks of installed dependencies and the real local production server.
 * All files and proxy destinations are disposable, non-sensitive local fixtures.
 * This does not execute the Windows RCE exploit or attempt resource exhaustion.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const net = require('node:net');
const { once } = require('node:events');
const { createRequire } = require('node:module');
const nextRequire = createRequire(require.resolve('next/package.json'));
const base = new URL(process.env.ATTUNE_AUDIT_BASE || 'http://localhost:3000');
const api = new URL(process.env.ATTUNE_API_BASE || 'http://localhost:8000');
const output = path.resolve(process.env.ATTUNE_SECURITY_OUT || 'audit-results/dependency-security.json');
const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
assert(loopback.has(base.hostname) && loopback.has(api.hostname), 'Only local test servers are permitted');
const results = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: 'PASS', detail });
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.stack });
  }
  console.log(JSON.stringify(results.at(-1)));
}

async function main() {
  const tempParent = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(tempParent, 'attune-security-'));
  try {
    await check('Incremental cache contains native traversal keys', async () => {
      const { default: FileSystemCache } = nextRequire('./dist/server/lib/incremental-cache/file-system-cache');
      const { nodeFs } = nextRequire('./dist/server/lib/node-fs-methods');
      const { IncrementalCacheKind, CachedRouteKind } = nextRequire('./dist/server/response-cache/types');
      const serverDistDir = path.join(root, 'incremental', '.next', 'server');
      await fs.mkdir(serverDistDir, { recursive: true });
      const cache = new FileSystemCache({ fs: nodeFs, flushToDisk: true, serverDistDir,
        revalidatedTags: [], maxMemoryCacheSize: 0 });
      const kinds = ['FETCH', 'PAGES', 'IMAGE', 'APP_PAGE', 'APP_ROUTE'];
      for (const kind of kinds) {
        assert(cache.getFilePath('valid/nested-key', IncrementalCacheKind[kind]).includes('nested-key'));
        for (const key of [`..${path.sep}outside`, `valid${path.sep}..${path.sep}..${path.sep}outside`]) {
          assert.throws(() => cache.getFilePath(key, IncrementalCacheKind[kind]), /Invalid file path/);
        }
      }
      const sentinel = path.join(root, 'incremental', '.next', 'cache', 'outside');
      await fs.mkdir(path.dirname(sentinel), { recursive: true });
      await fs.writeFile(sentinel, 'DISPOSABLE_SENTINEL');
      const value = { kind: CachedRouteKind.FETCH, data: { headers: {}, body: 'valid', status: 200,
        url: 'http://127.0.0.1/controlled-fixture' }, revalidate: 60 };
      await cache.set('safe-entry', value, { fetchCache: true, tags: [] });
      const persisted = JSON.parse(await fs.readFile(cache.getFilePath('safe-entry', IncrementalCacheKind.FETCH), 'utf8'));
      assert.equal(persisted.data.body, 'valid');
      await assert.rejects(cache.set(`..${path.sep}outside`, value, { fetchCache: true, tags: [] }), /Invalid file path/);
      assert.equal(await fs.readFile(sentinel, 'utf8'), 'DISPOSABLE_SENTINEL');
      const { default: escapePathDelimiters } = nextRequire('./dist/shared/lib/router/utils/escape-path-delimiters');
      assert(!escapePathDelimiters('segment\\outside', true).includes('\\'));
      return { platform: process.platform, cacheKinds: kinds, traversalKeysRejected: 10,
        realSafeWrite: true, sentinelUnchanged: true, backslashNeutralized: true };
    });

    await check('Production upgrade handler rejects absolute proxy destinations', async () => {
      assert.equal((await fetch(base, { signal: AbortSignal.timeout(5000) })).status, 200);
      let connections = 0;
      const target = http.createServer((req, res) => res.end('CONTROLLED_PROXY_FIXTURE'));
      const sockets = new Set();
      target.on('connection', socket => { connections++; sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
      target.listen(0, '127.0.0.1');
      await once(target, 'listening');
      const targetPort = target.address().port;
      try {
        assert.equal(await (await fetch(`http://127.0.0.1:${targetPort}/positive-control`)).text(), 'CONTROLLED_PROXY_FIXTURE');
        const before = connections;
        const details = [];
        for (const protocol of ['http', 'ws']) {
          const requestTarget = `${protocol}://127.0.0.1:${targetPort}/bounded-fixture`;
          const result = await new Promise((resolve, reject) => {
            const socket = net.createConnection({ host: '127.0.0.1', port: Number(base.port || 80) });
            let received = '';
            let timer;
            socket.on('connect', () => {
              socket.write(`GET ${requestTarget} HTTP/1.1\r\nHost: ${base.host}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: QXR0dW5lQm91bmRlZFRlc3Q=\r\n\r\n`);
              timer = setTimeout(() => { socket.destroy(); reject(new Error('Unsafe upgrade did not terminate within 2 seconds')); }, 2000);
            });
            socket.on('data', data => { received += data.toString(); });
            socket.on('error', error => { clearTimeout(timer); reject(error); });
            socket.on('end', () => { clearTimeout(timer); resolve({ protocol, responseBytes: received.length }); });
          });
          await delay(75);
          assert.equal(connections, before, 'Next connected to the controlled proxy destination');
          details.push(result);
        }
        return { positiveControl: true, proxyConnections: connections - before, rejected: details };
      } finally {
        for (const socket of sockets) socket.destroy();
        await new Promise(resolve => target.close(resolve));
      }
    });

    await check('Image cache enforces a bounded disk budget across real variant keys', async () => {
      const { ImageOptimizerCache } = nextRequire('./dist/server/image-optimizer');
      const { imageConfigDefault } = nextRequire('./dist/shared/lib/image-config');
      const buffer = await fs.readFile(path.resolve('apps/vehicle-app/public/images/demo-skin-face.jpg'));
      const budget = buffer.length * 2;
      const distDir = path.join(root, 'images');
      const cache = new ImageOptimizerCache({ distDir, nextConfig: {
        images: { ...imageConfigDefault, minimumCacheTTL: 60, maximumDiskCacheSize: budget },
        experimental: { isrFlushToDisk: true }
      } });
      const keys = [];
      for (let i = 0; i < 12; i++) {
        const key = ImageOptimizerCache.getCacheKey({ href: `/fixture.jpg?variant=${i}`, width: 640,
          quality: 75, mimeType: 'image/jpeg' });
        keys.push(key);
        await cache.set(key, { kind: 'IMAGE', buffer, etag: `fixture-${i}`, upstreamEtag: 'controlled', extension: 'jpg' },
          { cacheControl: { revalidate: 60, expire: undefined } });
        assert(await cache.get(key), 'New variant must really be persisted and readable');
      }
      async function payloadSize(dir) {
        let bytes = 0;
        for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
          const file = path.join(dir, entry.name);
          if (entry.isDirectory()) bytes += await payloadSize(file);
          else bytes += (await fs.stat(file)).size;
        }
        return bytes;
      }
      let bytes;
      for (let attempt = 0; attempt < 40; attempt++) {
        bytes = await payloadSize(path.join(distDir, 'cache', 'images'));
        if (bytes <= budget) break;
        await delay(50);
      }
      assert(bytes <= budget, `Cache payload ${bytes} exceeds configured budget ${budget}`);
      assert.equal(await cache.get(keys[0]), null, 'Oldest variant must be evicted');
      assert(await cache.get(keys.at(-1)), 'Latest variant must remain readable');
      return { controlledVariants: keys.length, fixtureBytes: buffer.length, budgetBytes: budget,
        actualDiskBytes: bytes, oldestEvicted: true, latestReadable: true };
    });

    await check('Next-resolved PostCSS blocks previous-map traversal and preserves legitimate maps', async () => {
      const postcss = nextRequire('postcss');
      const inside = path.join(root, 'maps', 'inside');
      await fs.mkdir(inside, { recursive: true });
      const makeMap = marker => JSON.stringify({ version: 3, file: 'input.css', sources: ['fixture.css'],
        sourcesContent: [marker], names: [], mappings: 'AAAA' });
      const outsideMarker = 'DISPOSABLE_OUTSIDE_MAP_CONTENT';
      const outside = path.join(root, 'maps', 'outside.map');
      await fs.writeFile(outside, makeMap(outsideMarker));
      await fs.writeFile(path.join(inside, 'input.css.map'), makeMap('CONTROLLED_INSIDE_MAP_CONTENT'));
      const css = annotation => `a { color: red }\n/*# sourceMappingURL=${annotation} */`;
      const from = path.join(inside, 'input.css');
      const positive = postcss.parse(css('input.css.map'), { from });
      assert(positive.source.input.map.text.includes('CONTROLLED_INSIDE_MAP_CONTENT'), 'Legitimate source map must load');
      const variants = [
        { annotation: '../outside.map', options: { from } },
        { annotation: `..${path.sep}outside.map`, options: { from } },
        { annotation: outside, options: {} }
      ];
      for (const { annotation, options } of variants) {
        const parsed = postcss.parse(css(annotation), options);
        assert(!parsed.source.input.map?.text?.includes(outsideMarker), 'Outside map was auto-loaded');
        const compiled = await postcss([]).process(css(annotation), { ...options,
          map: { inline: false, annotation: false } });
        assert(!JSON.stringify(compiled.map?.toJSON()).includes(outsideMarker), 'Outside content reached output source map');
      }
      return { postcssVersion: nextRequire('postcss/package.json').version, legitimateMapLoaded: true,
        controlledTraversalVariantsRejected: variants.length };
    });

    await check('Actual API preserves trusted-origin and privacy CORS restrictions', async () => {
      const health = new URL('/api/health', api);
      const trusted = await fetch(health, { headers: { Origin: base.origin }, signal: AbortSignal.timeout(5000) });
      assert.equal(trusted.status, 200);
      assert.equal(trusted.headers.get('access-control-allow-origin'), base.origin);
      const origin = 'https://untrusted.attune.invalid';
      const untrusted = await fetch(health, { headers: { Origin: origin }, signal: AbortSignal.timeout(5000) });
      assert.equal(untrusted.status, 403);
      assert.equal(untrusted.headers.get('access-control-allow-origin'), null);
      const preflight = await fetch(health, { method: 'OPTIONS', headers: { Origin: origin,
        'Access-Control-Request-Method': 'GET' }, signal: AbortSignal.timeout(5000) });
      assert.equal(preflight.status, 400);
      assert.equal(preflight.headers.get('access-control-allow-origin'), null);
      return { trustedStatus: trusted.status, untrustedStatus: untrusted.status, preflightStatus: preflight.status };
    });
  } finally {
    // Verify the exact absolute disposable target before recursive deletion on Windows.
    assert.equal(path.dirname(root), tempParent);
    assert(path.basename(root).startsWith('attune-security-'));
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, JSON.stringify({ platform: process.platform, node: process.version,
      next: nextRequire('./package.json').version, results }, null, 2) + '\n');
  }
  process.exitCode = results.some(result => result.status !== 'PASS') ? 1 : 0;
}

main().catch(error => { console.error(error); process.exitCode = 1; });

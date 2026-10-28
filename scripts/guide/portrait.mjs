// Renders Tess's launcher portrait from the 3D model: guide/tess-face.png (eyes open) and guide/tess-blink.png
// (eyes closed), 192×192 with a transparent background. The Tour button shows these two images (CSS blink), so the
// small corner avatar costs no WebGL at all; the live 3D bust only runs inside the open panel.
//   node scripts/guide/portrait.mjs
// Serves site/ and the pinned three.js / three-vrm from node_modules to the browser through request routing.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = join(ROOT, 'site');
const ORIGIN = 'http://tess.local';
const SIZE = 192;
const TYPES = { '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html' };

const page = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}canvas{display:block}</style>
<script type="importmap">{ "imports": {
  "three": "/node_modules/three/build/three.module.js",
  "three/addons/": "/node_modules/three/examples/jsm/",
  "@pixiv/three-vrm": "/node_modules/@pixiv/three-vrm/lib/three-vrm.module.min.js" } }</script></head>
<body><canvas width="${SIZE}" height="${SIZE}"></canvas><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas'), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x30285a, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1.2, 2, 2.5); scene.add(key);
const rim = new THREE.DirectionalLight(0x22d3a6, 1.2); rim.position.set(-2, 1.6, -1.5); scene.add(rim);
const loader = new GLTFLoader(); loader.register((p) => new VRMLoaderPlugin(p));
const vrm = (await loader.loadAsync('/guide/tess.glb')).userData.vrm;
VRMUtils.rotateVRM0(vrm); scene.add(vrm.scene);
const head = vrm.humanoid.getNormalizedBoneNode('head');
vrm.scene.updateMatrixWorld(true);
const hp = head.getWorldPosition(new THREE.Vector3());
// face close-up: from the top of the hair to the chin, eyes a little above centre
const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 10);
camera.position.set(0, hp.y + 0.07, 0.95); camera.lookAt(0, hp.y + 0.065, 0);
vrm.lookAt.target = camera;
window.shoot = (blink) => {
  vrm.expressionManager.setValue('blink', blink); vrm.expressionManager.setValue('relaxed', 0.35);
  vrm.update(0); renderer.render(scene, camera);
};
window.ready = true;
</script></body></html>`;

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
await p.route(`${ORIGIN}/**`, (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/') return route.fulfill({ contentType: 'text/html', body: page });
  const file = path.startsWith('/node_modules/') ? join(ROOT, path) : join(SITE, path);
  return route.fulfill({ contentType: TYPES[extname(path)] ?? 'application/octet-stream', body: readFileSync(file) });
});
await p.goto(`${ORIGIN}/`);
await p.waitForFunction(() => window.ready, null, { timeout: 60_000 });
for (const [blink, name] of [[0, 'tess-face.png'], [1, 'tess-blink.png']]) {
  await p.evaluate((b) => window.shoot(b), blink);
  await p.locator('canvas').screenshot({ path: join(SITE, 'guide', name), omitBackground: true });
  console.log(`site/guide/${name}`);
}
await browser.close();

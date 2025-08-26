import { initRenderer, initScene, initCamera, initControls, renderFrame, addInstanced, setHoveredPlacement } from './engine/render.js';
import { generateTerrain, sampleHeight, terrainState } from './engine/terrain.js';
import { initECS, GameState, addStructure, updateGame, tryPlaceStructure, Projectiles } from './engine/gameplay.js';
import { initUI } from './engine/ui.js';
import { initPathfinding, PathGrid, recalcRegion } from './engine/pathfinding.js';
import { initNet } from './engine/net.js';
import { vec3 } from './engine/math.js';
import { seedNoise } from './engine/noise.js';

const canvas = document.getElementById('game');

seedNoise(1337);

const renderer = initRenderer(canvas);
const scene = initScene();
const camera = initCamera();
const controls = initControls(camera, renderer.domElement);

await initNet();

await generateTerrain(scene);
initPathfinding(terrainState);
initECS(scene);

const instanced = addInstanced(scene);

const gs = new GameState();
gs.scene = scene;

initUI(gs);

let isPlacing = null; // { type: 'turret_basic' | 'generator' | 'extractor' | 'wall', rot: number }
let placingPosition = vec3(0,0,0);

function worldToGrid(x, z) {
const g = PathGrid;
const gx = Math.floor((x - g.originX) / g.cellSize);
const gz = Math.floor((z - g.originZ) / g.cellSize);
return { gx, gz };
}

function gridToWorld(gx, gz) {
const g = PathGrid;
const x = g.originX + (gx + 0.5) * g.cellSize;
const z = g.originZ + (gz + 0.5) * g.cellSize;
const y = sampleHeight(x, z);
return { x, y, z };
}

function placeStructureAt(gx, gz, type, rot=0) {
const placed = tryPlaceStructure(gs, { gx, gz, type, rot });
if (placed) {
recalcRegion(gx, gz, 3);
}
return placed;
}

function raycastGround(ev) {
const rect = renderer.domElement.getBoundingClientRect();
const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
const ndc = { x, y };
// Custom ground raycast: binary search along camera ray for terrain height
const origin = camera.position.clone();
const dir = controls.getMouseRay(ndc.x, ndc.y);
let t0 = 0, t1 = 2000;
let hit = null;
for (let i = 0; i < 30; i++) {
const t = (t0 + t1)/2;
const px = origin.x + dir.x * t;
const py = origin.y + dir.y * t;
const pz = origin.z + dir.z * t;
const h = sampleHeight(px, pz);
if (py < h) {
hit = { x: px, y: h, z: pz };
t1 = t;
} else {
t0 = t;
}
}
return hit;
}

// Input
let keys = {};
window.addEventListener('keydown', (e) => {
keys[e.code] = true;
if (e.code === 'KeyB') {
if (isPlacing) { isPlacing = null; setHoveredPlacement(null); }
else { isPlacing = { type: 'turret_basic', rot: 0 }; }
} else if (e.code === 'Escape') {
isPlacing = null;
setHoveredPlacement(null);
} else if (e.code === 'KeyR') {
if (isPlacing) isPlacing.rot = ((isPlacing.rot + Math.PI/8) % (Math.PI*2));
} else if (e.code === 'KeyF') {
gs.orbital.request();
}
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

renderer.domElement.addEventListener('mousemove', (ev) => {
const hit = raycastGround(ev);
if (!hit) { setHoveredPlacement(null); return; }
if (isPlacing) {
placingPosition = vec3(hit.x, hit.y, hit.z);
const { gx, gz } = worldToGrid(hit.x, hit.z);
setHoveredPlacement({ gx, gz, type: isPlacing.type, rot: isPlacing.rot, valid: true });
}
});
renderer.domElement.addEventListener('mousedown', (ev) => {
if (ev.button === 0 && isPlacing) {
const hit = raycastGround(ev);
if (!hit) return;
const { gx, gz } = worldToGrid(hit.x, hit.z);
if (placeStructureAt(gx, gz, isPlacing.type, isPlacing.rot)) {
// keep placing
}
} else if (ev.button === 2) {
// right click: maybe select/command in future
}
});
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

document.querySelectorAll('.build-bar button').forEach(btn => {
btn.addEventListener('click', () => {
isPlacing = { type: btn.dataset.build, rot: 0 };
});
});
document.getElementById('btn-orbital').addEventListener('click', () => gs.orbital.request());
document.getElementById('btn-shield').addEventListener('click', () => gs.shield.request());
document.getElementById('btn-pause').addEventListener('click', () => gs.togglePause());
document.querySelectorAll('.tech').forEach(btn => {
btn.addEventListener('click', () => gs.research(btn.dataset.tech));
});
document.getElementById('btn-save').addEventListener('click', () => gs.save());
document.getElementById('btn-load').addEventListener('click', () => gs.load());

let lastTime = performance.now();
function loop(now) {
const dt = Math.min(0.05, (now - lastTime) / 1000);
lastTime = now;

updateGame(gs, dt, keys);
renderFrame(renderer, scene, camera, controls, gs, instanced);

requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

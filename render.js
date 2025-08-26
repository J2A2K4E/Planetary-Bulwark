import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { sampleHeight } from './terrain.js';

export function initRenderer(canvas) {
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
window.addEventListener('resize', () => {
renderer.setSize(window.innerWidth, window.innerHeight);
if (camera) {
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
}
});
return renderer;
}

export function initScene() {
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x091018);
return scene;
}

let camera = null;
export function initCamera() {
camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000);
camera.position.set(0, 80, 140);
camera.lookAt(0, 0, 0);
return camera;
}

export function initControls(cam, dom) {
const state = {
cam,
dom,
yaw: 0,
pitch: -0.7,
dist: 180,
target: new THREE.Vector3(0,0,0),
dragging: false,
lastX:0, lastY:0,
};
function updateCam() {
const x = state.target.x + Math.cos(state.yaw) * Math.cos(state.pitch) * state.dist;
const y = state.target.y + Math.sin(state.pitch) * state.dist;
const z = state.target.z + Math.sin(state.yaw) * Math.cos(state.pitch) * state.dist;
cam.position.set(x, y, z);
cam.lookAt(state.target);
}
state.getMouseRay = (nx, ny) => {
const invProj = new THREE.Matrix4().multiplyMatrices(cam.matrixWorld, new THREE.Matrix4().copy(cam.projectionMatrix).invert());
const pNear = new THREE.Vector3(nx, ny, -1).applyMatrix4(invProj);
const pFar = new THREE.Vector3(nx, ny, 1).applyMatrix4(invProj);
const dir = pFar.sub(pNear).normalize();
return dir;
};
dom.addEventListener('mousedown', (e) => {
if (e.button===2 || e.button===1) { state.dragging=true; state.lastX=e.clientX; state.lastY=e.clientY; }
});
window.addEventListener('mouseup', ()=> state.dragging=false);
dom.addEventListener('mousemove', (e) => {
if (!state.dragging) return;
const dx = e.clientX - state.lastX;
const dy = e.clientY - state.lastY;
state.lastX = e.clientX; state.lastY = e.clientY;
state.yaw -= dx * 0.003;
state.pitch = Math.min(-0.2, Math.max(-1.2, state.pitch - dy*0.003));
updateCam();
});
dom.addEventListener('wheel', (e) => {
state.dist = Math.min(400, Math.max(40, state.dist + e.deltaY * 0.2));
updateCam();
});
updateCam();
return state;
}

let hoveredMesh = null;
export function setHoveredPlacement(info) {
if (!hoveredMesh) return;
if (!info) { hoveredMesh.visible = false; return; }
hoveredMesh.visible = true;
const { gx, gz } = info;
const x = -256 + (gx + 0.5) * 4;
const z = -256 + (gz + 0.5) * 4;
const y = sampleHeight(x, z);
hoveredMesh.position.set(x, y+0.05, z);
}

export function addInstanced(scene) {
// Projectiles
const proj = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 8),
new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0x604000, emissiveIntensity: 0.6 }),
2000);
proj.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(proj);

// Placement helper
hoveredMesh = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.6, 24), new THREE.MeshBasicMaterial({ color: 0x66ff88 }));
hoveredMesh.rotation.x = -Math.PI/2;
hoveredMesh.visible = false;
scene.add(hoveredMesh);

return { proj };
}

export function renderFrame(renderer, scene, camera, controls, gs, inst) {
// Update projectile instances
const mat4 = new THREE.Matrix4();
let i=0;
for (const p of gs.ecs.projectiles) {
if (!p.alive) continue;
mat4.makeTranslation(p.pos.x, p.pos.y, p.pos.z);
inst.proj.setMatrixAt(i++, mat4);
}
inst.proj.count = i;
inst.proj.instanceMatrix.needsUpdate = true;

// Update enemies
gs.ecs.scene = scene;
gs.ecs.renderInstances();

renderer.render(scene, camera);
}

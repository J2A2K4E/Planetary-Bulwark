import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { ECS } from './ecs.js';
import { PathGrid, setBlockedHook, recalcRegion } from './pathfinding.js';
import { sampleHeight } from './terrain.js';
import { spawnWave, updateEnemies } from './ai.js';

export const Projectiles = [];

export function initECS(scene) {
// nothing yet
}

export class GameState {
constructor() {
this.scene = null;
this.ecs = new ECS();
this.ecs.scene = null;
this.resources = { minerals: 100, energy: 50, power: 0, powerCap: 0 };
this.wave = 0;
this.time = 0;
this.paused = false;
this.baseHP = 100;
this.baseTargetGrid = { x: (PathGrid.width/2)|0, z: (PathGrid.height/2)|0 };
this.structures = []; // mirror for quick lookup
this.underConstruction = [];
this.tech = new Set();
this.cooldowns = { orbital: 0, shield: 0 };
this.orbital = {
request: () => { if (this.cooldowns.orbital<=0) this.orbitalPending = 1; },
};
this.shield = {
request: () => { if (this.cooldowns.shield<=0) this.shieldPending = 1; },
};
setBlockedHook((gx,gz) => !!this.getStructureAt(gx,gz));
}

togglePause(){ this.paused = !this.paused; }

getStructureAt(gx, gz) {
return this.structures.find(s => s.gx===gx && s.gz===gz);
}

research(id) {
const costs = { turret2: 80, range1: 60, orbital1: 100, shield1: 80 };
if (this.tech.has(id)) return;
const c = costs[id] || 50;
if (this.resources.minerals < c) return;
this.resources.minerals -= c;
this.tech.add(id);
}

save() {
const save = {
resources: this.resources,
wave: this.wave,
baseHP: this.baseHP,
structures: this.structures.map(s => ({ type:s.type, gx:s.gx, gz:s.gz, rot:s.rot, hp:s.hp })),
tech: Array.from(this.tech),
};
fetch('/api/save', {
method: 'POST', headers: { 'Content-Type':'application/json' },
body: JSON.stringify({ sessionId: window.sessionId, save })
});
}

async load() {
const r = await fetch('/api/load?sessionId='+encodeURIComponent(window.sessionId));
const data = await r.json();
const save = data.save;
if (!save) return;
Object.assign(this.resources, save.resources);
this.wave = save.wave;
this.baseHP = save.baseHP;
this.structures = [];
for (const s of save.structures) {
const placed = addStructure(this, s);
if (placed) recalcRegion(s.gx, s.gz, 2);
}
this.tech = new Set(save.tech || []);
}
}

export function tryPlaceStructure(gs, { gx, gz, type, rot=0 }) {
const costs = {
turret_basic: { minerals: 20, energy: 5, power: 2 },
generator: { minerals: 30, energy: 0, powerCap: 5 },
extractor: { minerals: 25, energy: 0, power: 1 },
wall: { minerals: 10, energy: 0 },
};
const c = costs[type];
if (!c) return false;
if (gs.getStructureAt(gx,gz)) return false;
if (gs.resources.minerals < (c.minerals||0)) return false;
if (gs.resources.energy < (c.energy||0)) return false;
if (c.power && gs.resources.power + c.power > gs.resources.powerCap) return false;

gs.resources.minerals -= (c.minerals||0);
gs.resources.energy -= (c.energy||0);
gs.resources.power += (c.power||0);
gs.resources.powerCap += (c.powerCap||0);

addStructure(gs, { type, gx, gz, rot, hp: 100 });
return true;
}

export function addStructure(gs, { type, gx, gz, rot=0, hp=100 }) {
const x = PathGrid.originX + (gx + 0.5) * PathGrid.cellSize;
const z = PathGrid.originZ + (gz + 0.5) * PathGrid.cellSize;
const y = sampleHeight(x, z);
const geom = structureGeometry(type);
const mat = new THREE.MeshStandardMaterial({ color: structureColor(type), roughness: 0.8, metalness: 0.15 });
const mesh = new THREE.Mesh(geom, mat);
mesh.position.set(x, y, z);
mesh.rotation.y = rot;
mesh.castShadow = true;
mesh.receiveShadow = true;
gs.scene.add(mesh);

const s = { type, gx, gz, rot, hp, mesh, cooldown: 0 };
gs.structures.push(s);
return s;
}

function structureGeometry(type) {
switch(type){
case 'turret_basic': return new THREE.CylinderGeometry(0.8, 0.9, 1.2, 10);
case 'generator': return new THREE.ConeGeometry(1.0, 2.0, 8);
case 'extractor': return new THREE.BoxGeometry(1.2, 1.2, 1.2);
case 'wall': return new THREE.BoxGeometry(2.0, 1.0, 0.6);
default: return new THREE.BoxGeometry(1,1,1);
}
}
function structureColor(type) {
switch(type){
case 'turret_basic': return 0x66b1ff;
case 'generator': return 0xffd166;
case 'extractor': return 0x9be564;
case 'wall': return 0xbbc7d4;
default: return 0xffffff;
}
}

function turretRange(gs, s) {
let r = 14;
if (gs.tech.has('range1')) r += 6;
return r;
}

export function updateGame(gs, dt, keys) {
if (gs.paused) dt = 0;

gs.time += dt;
gs.cooldowns.orbital = Math.max(0, gs.cooldowns.orbital - dt);
gs.cooldowns.shield = Math.max(0, gs.cooldowns.shield - dt);

// Wave manager
if (gs.time > 5 + gs.wave * 15) {
gs.wave++;
spawnWave(gs, 6 + gs.wave * 2);
}

// Resource trickle
const extractorCount = gs.structures.filter(s=>s.type==='extractor').length;
const generatorCount = gs.structures.filter(s=>s.type==='generator').length;
gs.resources.minerals += extractorCount * dt * 1.0;
gs.resources.energy += generatorCount * dt * 0.8;
gs.resources.minerals = Math.min(gs.resources.minerals, 9999);
gs.resources.energy = Math.min(gs.resources.energy, 9999);

// Turret logic
for (const s of gs.structures) {
if (s.type.startsWith('turret')) {
s.cooldown -= dt;
if (s.cooldown <= 0) {
const target = findTarget(gs, s, turretRange(gs, s));
if (target) {
fireAt(gs, s, target);
s.cooldown = gs.tech.has('turret2') ? 0.4 : 0.7;
}
}
}
}

// Projectiles
for (const p of gs.ecs.projectiles) {
p.life -= dt;
if (p.life <= 0) { p.alive = false; continue; }
p.pos.x += p.vel.x * dt;
p.pos.y += p.vel.y * dt;
p.pos.z += p.vel.z * dt;

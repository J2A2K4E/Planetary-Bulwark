import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { sampleHeight } from './terrain.js';

export class ECS {
constructor(scene) {
this.scene = scene;
this.enemies = [];
this.structures = []; // {type,gx,gz,rot,hp,mesh}
this.projectiles = [];
this.enemyMesh = null;
this.initialized = false;
}

initMeshes() {
if (this.initialized) return;
// Basic enemy mesh
const geo = new THREE.CapsuleGeometry(0.6, 0.8, 4, 8);
const mat = new THREE.MeshStandardMaterial({ color: 0xff5566, roughness: 0.6, metalness: 0.2 });
this.enemyMesh = new THREE.InstancedMesh(geo, mat, 2000);
this.enemyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
this.enemyMesh.castShadow = true;
this.scene.add(this.enemyMesh);
this.initialized = true;
}

spawnEnemy(gx, gz, path) {
this.initMeshes();
const w = gridToWorld(gx, gz);
this.enemies.push({
pos: { x: w.x, y: w.y, z: w.z },
path,
pathIndex: 0,
alive: true,
hp: 30,
pathTimer: 1.5 + Math.random(),
});
}

forEachEnemy(fn) {
for (const e of this.enemies) if (e.alive) fn(e);
}

cleanup() {
this.enemies = this.enemies.filter(e => e.alive);
this.structures = this.structures.filter(s => s.hp > 0);
this.projectiles = this.projectiles.filter(p => p.alive);
}

renderInstances() {
if (!this.enemyMesh) return;
let i=0;
const mat4 = new THREE.Matrix4();
for (const e of this.enemies) if (e.alive) {
mat4.makeTranslation(e.pos.x, e.pos.y, e.pos.z);
this.enemyMesh.setMatrixAt(i++, mat4);
}
this.enemyMesh.count = i;
this.enemyMesh.instanceMatrix.needsUpdate = true;
}
}

function gridToWorld(gx, gz) {
const size = 4;
const originX = -256;
const originZ = -256;
const x = originX + (gx + 0.5) * size;
const z = originZ + (gz + 0.5) * size;
const y = sampleHeight(x, z);
return { x, y, z };
}


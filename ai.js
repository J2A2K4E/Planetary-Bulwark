import { PathGrid, findPath } from './pathfinding.js';
import { sampleHeight } from './terrain.js';

export function spawnWave(gs, count=10, radius=240) {
const enemies = gs.ecs;
const spawns = [];
for (let i=0;i<count;i++) {
const angle = Math.random()Math.PI2;
const x = Math.cos(angle)*radius;
const z = Math.sin(angle)*radius;
const gx = Math.max(0, Math.min(PathGrid.width-1, ((x - PathGrid.originX)/PathGrid.cellSize)|0));
const gz = Math.max(0, Math.min(PathGrid.height-1, ((z - PathGrid.originZ)/PathGrid.cellSize)|0));
spawns.push({ gx, gz });
}
for (const s of spawns) {
const t = gs.baseTargetGrid; // goal grid cell near base core
const path = findPath({ x: s.gx, z: s.gz }, t);
gs.ecs.spawnEnemy(s.gx, s.gz, path);
}
}

export function updateEnemies(gs, dt) {
gs.ecs.forEachEnemy((e) => {
e.pathTimer -= dt;
if (!e.path || e.pathIndex >= e.path.length) {
// reached goal -> damage base
gs.baseHP -= 5 * dt;
e.alive = false;
return;
}
const next = e.path[e.pathIndex];
const world = gridToWorld(next.x, next.z);
const dx = world.x - e.pos.x;
const dz = world.z - e.pos.z;
const dist = Math.hypot(dx, dz);
const speed = 8;
if (dist < 1) {
e.pathIndex++;
} else {
e.pos.x += (dx/dist) * speed * dt;
e.pos.z += (dz/dist) * speed * dt;
e.pos.y = world.y;
}
  // If timer expires, re-path to adapt to new defenses
if (e.pathTimer <= 0) {
  e.pathTimer = 1.5 + Math.random();
  const curG = worldToGrid(e.pos.x, e.pos.z);
  e.path = findPath(curG, gs.baseTargetGrid) || e.path;
  e.pathIndex = 0;
}
  });
}

function worldToGrid(x, z) {
const g = PathGrid;
const gx = Math.max(0, Math.min(g.width-1, ((x - g.originX)/g.cellSize)|0));
const gz = Math.max(0, Math.min(g.height-1, ((z - g.originZ)/g.cellSize)|0));
return { x: gx, z: gz };
}
function gridToWorld(gx, gz) {
const g = PathGrid;
const x = g.originX + (gx + 0.5) * g.cellSize;
const z = g.originZ + (gz + 0.5) * g.cellSize;
const y = sampleHeight(x, z);
return { x, y, z };
}

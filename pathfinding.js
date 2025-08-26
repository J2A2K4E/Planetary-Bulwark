import { sampleHeight, terrainState } from './terrain.js';

export const PathGrid = {
width: 128,
height: 128,
cellSize: 4,
originX: -256,
originZ: -256,
cells: null, // Uint8: 0 free, 1 blocked
cost: null, // Float32 costs for terrain slope etc.
};

export function initPathfinding(ts) {
const g = PathGrid;
g.cells = new Uint8Array(g.width * g.height);
g.cost = new Float32Array(g.width * g.height);

// Precompute base traversal cost from slope
for (let gz=0; gz<g.height; gz++) {
for (let gx=0; gx<g.width; gx++) {
const i = gz*g.width + gx;
const x = g.originX + (gx+0.5)*g.cellSize;
const z = g.originZ + (gz+0.5)g.cellSize;
const h = sampleHeight(x,z);
const hx = sampleHeight(x+1,z);
const hz = sampleHeight(x,z+1);
const slope = Math.abs(hx - h) + Math.abs(hz - h);
g.cost[i] = 1 + Math.min(3, slope2);
g.cells[i] = 0;
}
}
}

export function recalcRegion(cx, cz, r=2) {
const g = PathGrid;
for (let dz=-r; dz<=r; dz++) {
for (let dx=-r; dx<=r; dx++) {
const gx = cx+dx, gz = cz+dz;
if (gx<0||gz<0||gx>=g.width||gz>=g.height) continue;
// Recompute blocked flag based on structures via a hook others can set
g.cells[gz*g.width+gx] = isBlocked(gx, gz) ? 1 : 0;
}
}
}

let blockedHook = () => false;
export function setBlockedHook(fn) { blockedHook = fn; }
function isBlocked(gx,gz){ return blockedHook(gx,gz); }

export function findPath(from, to) {
const g = PathGrid;
const w = g.width, h = g.height;
const start = (from.z|0)w + (from.x|0);
const goal = (to.z|0)w + (to.x|0);
const open = new MinHeap((a,b)=>a.f-b.f);
const nodes = new Map();
const inOpen = new Uint8Array(wh);
const inClosed = new Uint8Array(wh);

function heuristic(ix, iz) {
const dx = Math.abs(ix - to.x);
const dz = Math.abs(iz - to.z);
return (dx + dz) + 0.2 * Math.hypot(dx, dz);
}

function push(i, gCost, hCost, parent=-1) {
const n = nodes.get(i) || { i, g:Infinity, h:0, f:Infinity, parent };
if (gCost < n.g) {
n.g = gCost;
n.h = hCost;
n.f = gCost + hCost;
n.parent = parent;
nodes.set(i, n);
if (!inOpen[i]) { open.push(n); inOpen[i]=1; }
else { open.update(n); }
}
}

const sx = from.x|0, sz = from.z|0;
push(start, 0, heuristic(sx, sz), -1);

const neighbors = [
[1,0,1],[ -1,0,1],[0,1,1],[0,-1,1],
[1,1,1.41],[1,-1,1.41],[-1,1,1.41],[-1,-1,1.41],
];

while (open.size>0) {
const cur = open.pop();
const i = cur.i;
if (i===goal) {
// reconstruct
const path = [];
let n = cur;
while (n && n.parent!==-1) {
path.push(n.i);
n = nodes.get(n.parent);
}
path.reverse();
return path.map(idx => {
const gx = idx % w;
const gz = (idx / w) | 0;
return { x: gx, z: gz };
});
}
inOpen[i]=0; inClosed[i]=1;
const cx = i % w;
const cz = (i / w)|0;
for (const [dx,dz,base] of neighbors) {
  const nx = cx + dx;
  const nz = cz + dz;
  if (nx<0||nz<0||nx>=w||nz>=h) continue;
  const ni = nz*w + nx;
  if (inClosed[ni]) continue;
  if (g.cells[ni]) continue; // blocked
  const tg = cur.g + base * g.cost[ni];
  push(ni, tg, heuristic(nx,nz), i);
} 
}
return null;
}

class MinHeap {
constructor(cmp){ this.data=[]; this.cmp=cmp; this.index=new Map(); }
get size(){ return this.data.length; }
push(x){ this.data.push(x); this.bubbleUp(this.data.length-1); }
pop(){
const a = this.data[0];
const b = this.data.pop();
if (this.data.length) { this.data[0]=b; this.bubbleDown(0); }
return a;
}
update(x){
const i = this.data.indexOf(x);
if (i>=0){ this.bubbleUp(i); this.bubbleDown(i); }
}
bubbleUp(i){
const d=this.data;
while(i>0){
const p=(i-1>>1);
if (this.cmp(d[i], d[p])>=0) break;
[d[i], d[p]]=[d[p], d[i]]; i=p;
}
}
bubbleDown(i){
const d=this.data;
while(true){
const l=i*2+1, r=l+1;
let m=i;
if (l<d.length && this.cmp(d[l], d[m])<0) m=l;
if (r<d.length && this.cmp(d[r], d[m])<0) m=r;
if (m===i) break;
[d[i], d[m]]=[d[m], d[i]]; i=m;
}
}
}  

import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { perlin } from './noise.js';

export const terrainState = {
size: 512,
resolution: 256,
heightScale: 40,
mesh: null,
heights: null,
origin: { x: -256, z: -256 },
};

export function sampleHeight(x, z) {
const ts = terrainState;
const nx = (x - ts.origin.x) / ts.size;
const nz = (z - ts.origin.z) / ts.size;
const h = fbm(nx2, nz2) * 0.7 + fbm(nx6, nz6) * 0.3;
return (h - 0.5) * ts.heightScale;
}

function fbm(x, z) {
let a = 0, amp = 1, freq = 1;
for (let i=0;i<4;i++) {
a += perlin(xfreq, zfreq, 0.5) * amp;
amp *= 0.5; freq *= 2.0;
}
return a / 1.875;
}

export async function generateTerrain(scene) {
const ts = terrainState;
const geo = new THREE.PlaneGeometry(ts.size, ts.size, ts.resolution, ts.resolution);
geo.rotateX(-Math.PI/2);

const pos = geo.attributes.position;
const count = pos.count;
const heights = new Float32Array(count);
for (let i=0;i<count;i++) {
const x = pos.getX(i);
const z = pos.getZ(i);
const h = sampleHeight(x, z);
pos.setY(i, h);
heights[i] = h;
}
pos.needsUpdate = true;
geo.computeVertexNormals();

const mat = new THREE.MeshStandardMaterial({
color: 0x304a5a,
roughness: 0.95,
metalness: 0.05,
flatShading: false,
});
const mesh = new THREE.Mesh(geo, mat);
mesh.receiveShadow = true;

const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x202020, 0.9);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(200, 300, 100);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.left = -300;
dir.shadow.camera.right = 300;
dir.shadow.camera.top = 300;
dir.shadow.camera.bottom = -300;

scene.add(hemi, dir, mesh);

terrainState.mesh = mesh;
terrainState.heights = heights;
}


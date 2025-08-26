let perm = new Uint8Array(512);

export function seedNoise(seed=1337) {
const p = new Uint8Array(256);
for (let i=0;i<256;i++) p[i]=i;
let s = seed>>>0;
for (let i=255;i>0;i--) {
s = (s*1664525 + 1013904223)>>>0;
const j = s % (i+1);
const t = p[i]; p[i] = p[j]; p[j] = t;
}
for (let i=0;i<512;i++) perm[i]=p[i&255];
}

function fade(t){ return ttt*(t*(t*6-15)+10); }
function grad(hash, x, y, z) {
const h = hash & 15;
const u = h<8 ? x : y;
const v = h<4 ? y : (h===12||h===14 ? x : z);
return ((h&1)?-u:u) + ((h&2)?-v:v);
}

export function perlin(x, y, z=0){
const X = Math.floor(x) & 255;
const Y = Math.floor(y) & 255;
const Z = Math.floor(z) & 255;

x -= Math.floor(x);
y -= Math.floor(y);
z -= Math.floor(z);

const u = fade(x), v = fade(y), w = fade(z);
const A = (perm[X ] + Y) & 255;
const AA = (perm[A ] + Z) & 255;
const AB = (perm[A+1] + Z) & 255;
const B = (perm[X+1] + Y) & 255;
const BA = (perm[B ] + Z) & 255;
const BB = (perm[B+1] + Z) & 255;

const res = lerp(
lerp(
lerp(grad(perm[AA ], x , y , z ), grad(perm[BA ], x-1, y , z ), u),
lerp(grad(perm[AB ], x , y-1, z ), grad(perm[BB ], x-1, y-1, z ), u),
v
),
lerp(
lerp(grad(perm[AA+1], x , y , z-1), grad(perm[BA+1], x-1, y , z-1), u),
lerp(grad(perm[AB+1], x , y-1, z-1), grad(perm[BB+1], x-1, y-1, z-1), u),
v
),
w
);
return (res + 1) / 2;
}

function lerp(a,b,t){ return a + (b-a)*t; }

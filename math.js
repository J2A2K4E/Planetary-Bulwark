export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function smoothstep(a, b, x) {
const t = clamp((x - a)/(b - a), 0, 1);
return tt(3-2t);
}
export function vec3(x=0,y=0,z=0) { return {x,y,z}; }
export function len2(x,y,z){ return Math.sqrt(xx+yy+zz); }
export function normalize(v){
const l = Math.hypot(v.x, v.y, v.z) || 1;
return { x: v.x/l, y: v.y/l, z: v.z/l };
}
export function add(a,b){ return { x: a.x+b.x, y: a.y+b.y, z: a.z+b.z }; }
export function sub(a,b){ return { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z }; }
export function mul(v, s){ return { x: v.xs, y: v.ys, z: v.zs }; }
export function dot(a,b){ return a.xb.x + a.yb.y + a.zb.z; }
export function cross(a,b){ return { x: a.yb.z-a.zb.y, y: a.zb.x-a.xb.z, z: a.xb.y-a.yb.x }; }


import { PathGrid } from './pathfinding.js';

export function initUI(gs) {
const $ = (sel)=>document.querySelector(sel);
const minerals = $('#res-minerals');
const energy = $('#res-energy');
const power = $('#res-power');
const wave = $('#res-wave');
const btnOrb = $('#btn-orbital');
const btnShield = $('#btn-shield');
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');

async function ensureSession() {
if (window.sessionId) return;
const r = await fetch('/api/session', { method: 'POST' });
const data = await r.json();
window.sessionId = data.sessionId;
}
ensureSession();

function drawMinimap() {
mctx.clearRect(0,0,minimap.width,minimap.height);
// base
mctx.fillStyle = '#2b3d4f';
mctx.fillRect(0,0,minimap.width,minimap.height);
  // structures
mctx.fillStyle = '#9be564';
for (const s of gs.structures) {
  const x = (s.gx / PathGrid.width) * minimap.width;
  const y = (s.gz / PathGrid.height) * minimap.height;
  mctx.fillRect(x-2, y-2, 4, 4);
}
// enemies
mctx.fillStyle = '#ff6b6b';
for (const e of gs.ecs.enemies) {
  if (!e.alive) continue;
  const gx = Math.max(0, Math.min(PathGrid.width-1, ((e.pos.x - PathGrid.originX)/PathGrid.cellSize)|0));
  const gz = Math.max(0, Math.min(PathGrid.height-1, ((e.pos.z - PathGrid.originZ)/PathGrid.cellSize)|0));
  const x = (gx / PathGrid.width) * minimap.width;
  const y = (gz / PathGrid.height) * minimap.height;
  mctx.fillRect(x-1, y-1, 2, 2);
}
requestAnimationFrame(drawMinimap);
  }
requestAnimationFrame(drawMinimap);

function tick() {
minerals.textContent = Minerals: ${Math.floor(gs.resources.minerals)};
energy.textContent = Energy: ${Math.floor(gs.resources.energy)};
power.textContent = Power: ${Math.floor(gs.resources.power)}/${Math.floor(gs.resources.powerCap)};
wave.textContent = Wave: ${gs.wave};
btnOrb.disabled = gs.cooldowns.orbital > 0;
btnShield.disabled = gs.cooldowns.shield > 0;
requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
}

// HUD: DOM readouts (stars, health, money, ammo, objective, speed,
// dialogue, banners) plus the live minimap canvas.
import { WORLD_W, WORLD_H, PLACES } from './config.js';
import { wantedLabel } from './police.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  return {
    stars: el('hud-stars'),
    health: el('hud-health-fill'),
    healthText: el('hud-health-text'),
    money: el('hud-money'),
    ammo: el('hud-ammo'),
    objective: el('hud-objective'),
    speed: el('hud-speed'),
    message: el('hud-message'),
    dialogue: el('hud-dialogue'),
    banner: el('hud-banner'),
    minimap: el('minimap'),
  };
}

export function updateHud(hud, state) {
  const p = state.player;
  hud.stars.textContent = wantedLabel(state.wanted);
  hud.stars.style.color = state.wanted > 0 ? '#ff5b4d' : '#888';
  hud.health.style.width = `${Math.max(0, p.hp)}%`;
  hud.health.style.background = p.hp > 50 ? '#2ecc71' : p.hp > 25 ? '#f39c12' : '#e74c3c';
  hud.healthText.textContent = `HP ${Math.ceil(p.hp)}`;
  hud.money.textContent = `$${Math.floor(p.money)}`;
  hud.ammo.textContent = p.inCar ? '—' : `Ammo ${p.ammo}`;
  const car = p.inCar ? state.cars.find((c) => c.id === p.inCar) : null;
  hud.speed.textContent = car ? `${Math.round(Math.abs(car.speed) * 0.36)} km/h · ${car.model}` : 'On foot';
  const obj = state.objective;
  hud.objective.textContent = obj && obj.label ? `◆ ${obj.label}` : 'Free roam';
  hud.message.textContent = state.messageTimer > 0 ? state.message : '';
  hud.dialogue.style.display = state.dialogueTimer > 0 ? 'block' : 'none';
  hud.dialogue.textContent = state.dialogue || '';
  hud.banner.style.display = state.bannerTimer > 0 ? 'block' : 'none';
  hud.banner.textContent = state.banner || '';
  drawMinimap(hud.minimap, state);
}

function drawMinimap(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width; const H = canvas.height;
  const sx = W / WORLD_W; const sy = H / WORLD_H;
  ctx.fillStyle = '#1d3a24';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2e86c1';
  ctx.fillRect(3020 * sx, 0, (WORLD_W - 3020) * sx, H);
  ctx.fillStyle = '#f5e6a8';
  ctx.fillRect(2840 * sx, 0, 180 * sx, H);
  ctx.fillStyle = '#8d9499';
  ctx.fillRect(0, 2050 * sy, W, (WORLD_H - 2050) * sy);
  ctx.fillStyle = '#3d3d3d';
  for (const rx of [200, 600, 1000, 1400, 1800, 2200, 2600, 3000]) ctx.fillRect(rx * sx - 1, 0, 3, H);
  for (const ry of [200, 600, 1000, 1400, 1800, 2200]) ctx.fillRect(0, ry * sy - 1, W, 3);
  // Buildings as dots.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (const b of state.city.buildings) ctx.fillRect(b.x * sx, b.y * sy, 2, 2);
  // Safehouse.
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(PLACES.safehouse.x * sx - 3, PLACES.safehouse.y * sy - 3, 6, 6);
  // Mission blip (pulsing yellow).
  const obj = state.objective;
  if (obj && obj.x) {
    const r = 4 + 2 * Math.sin(state.time * 5);
    ctx.fillStyle = '#ffe600';
    ctx.beginPath(); ctx.arc(obj.x * sx, obj.y * sy, r, 0, Math.PI * 2); ctx.fill();
  }
  // Police blips (big, bright, dark-outlined so they read at a glance).
  for (const car of state.cars) {
    if (!car.isPolice || car.dead) continue;
    ctx.beginPath(); ctx.arc(car.x * sx, car.y * sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2d55'; ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(car.x * sx, car.y * sy, 2, 0, Math.PI * 2); ctx.fill();
  }
  for (const cop of state.cops) {
    if (cop.hp <= 0) continue;
    ctx.beginPath(); ctx.arc(cop.x * sx, cop.y * sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = cop.isGang ? '#ff9f1a' : '#2f6bff'; ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  }
  // Player (big white dot, unmistakable dark ring).
  const p = state.player;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

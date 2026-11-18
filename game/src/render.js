// Canvas rendering: camera, ground, roads, buildings, beach, sea, port,
// cars, people, bullets, markers, and the title / pause / game-over screens.
import { WORLD_W, WORLD_H, ROAD_W, PLACES, CAR_MODELS } from './config.js';
import { ROAD_XS, ROAD_YS, districtAt } from './city.js';
import { wantedLabel } from './police.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

export function cameraFor(state, vw, vh) {
  const p = state.player;
  return {
    x: Math.max(0, Math.min(WORLD_W - vw, p.x - vw / 2)),
    y: Math.max(0, Math.min(WORLD_H - vh, p.y - vh / 2)),
    w: vw, h: vh,
  };
}

function drawCar(ctx, car) {
  const spec = CAR_MODELS[car.model];
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const L = car.model === 'truck' ? 62 : 48;
  const W = car.model === 'truck' ? 26 : 24;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-L / 2 + 3, -W / 2 + 4, L, W);
  ctx.fillStyle = car.model === 'police' ? '#f4f6f7' : car.color;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -W / 2, L, W, 7);
  ctx.fill();
  if (car.model === 'police') {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-6, -W / 2, 12, W);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(-L / 2 + 4, -W / 2, 8, 6);
    ctx.fillStyle = '#2e86c1';
    ctx.fillRect(-L / 2 + 4, W / 2 - 6, 8, 6);
  }
  // Windows + roof.
  ctx.fillStyle = '#aed6f1';
  ctx.fillRect(-8, -W / 2 + 4, 14, W - 8);
  ctx.fillStyle = shade(car.model === 'police' ? '#f4f6f7' : car.color, 0.75);
  ctx.fillRect(-L / 2 + 6, -W / 2 + 3, 10, W - 6);
  // Wheels.
  ctx.fillStyle = '#111';
  ctx.fillRect(-L / 2 + 6, -W / 2 - 3, 10, 5);
  ctx.fillRect(-L / 2 + 6, W / 2 - 2, 10, 5);
  ctx.fillRect(L / 2 - 16, -W / 2 - 3, 10, 5);
  ctx.fillRect(L / 2 - 16, W / 2 - 2, 10, 5);
  if (car.brakeLight) {
    ctx.fillStyle = '#ff2d00';
    ctx.fillRect(-L / 2 - 2, -W / 2 + 2, 4, 5);
    ctx.fillRect(-L / 2 - 2, W / 2 - 7, 4, 5);
  }
  if (car.marked) {
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-L / 2 - 4, -W / 2 - 4, L + 8, W + 8, 9);
    ctx.stroke();
  }
  ctx.restore();
  // Damage smoke.
  if (car.smoke) {
    ctx.fillStyle = 'rgba(120,120,120,0.55)';
    ctx.beginPath();
    ctx.arc(car.x - Math.cos(car.angle) * 18, car.y - Math.sin(car.angle) * 18, 9 + Math.random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (car.dead) {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(car.x - 14, car.y - 10); ctx.lineTo(car.x + 14, car.y + 10);
    ctx.moveTo(car.x + 14, car.y - 10); ctx.lineTo(car.x - 14, car.y + 10);
    ctx.stroke();
  }
}

function drawPerson(ctx, x, y, angle, shirt, skin, isCop, isGang, hp) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 6, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(angle);
  ctx.fillStyle = isCop ? '#1a2a5e' : isGang ? '#5b2c2c' : shirt;
  ctx.beginPath(); ctx.roundRect(-7, -8, 14, 18, 5); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(11, 0, 6.5, 0, Math.PI * 2); ctx.fill();
  if (isCop) { ctx.fillStyle = '#1a2a5e'; ctx.fillRect(4, -6, 6, 12); }
  ctx.restore();
  if (hp < 60 && hp > 0) {
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x - 12, y - 20, 24 * (hp / 60), 3);
  }
}

export function drawWorld(ctx, state, cam) {
  const city = state.city;
  ctx.fillStyle = '#7ec850';
  ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
  // Sea + beach (east edge).
  ctx.fillStyle = '#2e86c1';
  ctx.fillRect(3020, cam.y, WORLD_W - 3020, cam.h);
  ctx.fillStyle = '#3a9ad9';
  ctx.fillRect(3020, cam.y, 26, cam.h);
  ctx.fillStyle = '#f5e6a8';
  ctx.fillRect(2840, cam.y, 180, cam.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = Math.floor(cam.y / 60) * 60; y < cam.y + cam.h; y += 60) {
    ctx.moveTo(3020, y);
    ctx.quadraticCurveTo(3040, y + 15, 3020, y + 30);
  }
  ctx.stroke();
  // Park grass tint.
  ctx.fillStyle = '#58b368';
  ctx.fillRect(648, 1448, 304, 304);
  // Port concrete (south edge).
  ctx.fillStyle = '#8d9499';
  ctx.fillRect(cam.x, 2050, cam.w, WORLD_H - 2050);
  // Roads.
  ctx.fillStyle = '#3d3d3d';
  for (const rx of ROAD_XS) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of ROAD_YS) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  // Sidewalks.
  ctx.fillStyle = '#b9b9b9';
  for (const rx of ROAD_XS) {
    ctx.fillRect(rx - ROAD_W / 2 - 12, 0, 10, WORLD_H);
    ctx.fillRect(rx + ROAD_W / 2 + 2, 0, 10, WORLD_H);
  }
  for (const ry of ROAD_YS) {
    ctx.fillRect(0, ry - ROAD_W / 2 - 12, WORLD_W, 10);
    ctx.fillRect(0, ry + ROAD_W / 2 + 2, WORLD_W, 10);
  }
  // Lane dashes.
  ctx.strokeStyle = '#f7dc6f';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 22]);
  ctx.beginPath();
  for (const rx of ROAD_XS) { ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD_H); }
  for (const ry of ROAD_YS) { ctx.moveTo(0, ry); ctx.lineTo(WORLD_W, ry); }
  ctx.stroke();
  ctx.setLineDash([]);
  // Crosswalks at junctions.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const rx of ROAD_XS) for (const ry of ROAD_YS) {
    if (rx < cam.x - 100 || rx > cam.x + cam.w + 100 || ry < cam.y - 100 || ry > cam.y + cam.h + 100) continue;
    for (let i = -3; i <= 3; i += 1) ctx.fillRect(rx + i * 12 - 4, ry - ROAD_W / 2 - 2, 8, 12);
  }
  // Buildings with fake height shading + windows.
  for (const b of city.buildings) {
    if (b.x > cam.x + cam.w || b.x + b.w < cam.x || b.y > cam.y + cam.h || b.y + b.h < cam.y) continue;
    const h = b.tall * 7;
    ctx.fillStyle = shade(b.color, 0.7);
    ctx.fillRect(b.x + h * 0.4, b.y - h * 0.4, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,200,0.55)';
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 24));
    for (let i = 0; i < cols; i += 1) for (let j = 0; j < rows; j += 1) {
      if ((i * 7 + j * 3 + Math.floor(b.x)) % 4 !== 0) continue;
      ctx.fillRect(b.x + 8 + i * 26, b.y + 8 + j * 24, 11, 9);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
  // Trees (palm on the beach, round elsewhere).
  for (const t of city.trees) {
    if (t.x < cam.x - 40 || t.x > cam.x + cam.w + 40 || t.y < cam.y - 40 || t.y > cam.y + cam.h + 40) continue;
    ctx.fillStyle = '#6e4b2a';
    ctx.fillRect(t.x - 2, t.y - 2, 4, 10);
    ctx.fillStyle = t.palm ? '#2ecc71' : '#27ae60';
    ctx.beginPath(); ctx.arc(t.x, t.y - 4, t.palm ? 13 : 11, 0, Math.PI * 2); ctx.fill();
  }
  // Props: crates, containers, umbrellas, cranes, pond.
  for (const pr of city.props) {
    if (pr.x < cam.x - 60 || pr.x > cam.x + cam.w + 60 || pr.y < cam.y - 60 || pr.y > cam.y + cam.h + 60) continue;
    if (pr.kind === 'crate') { ctx.fillStyle = '#a67c52'; ctx.fillRect(pr.x - 14, pr.y - 14, 28, 28); ctx.strokeStyle = '#7d5a3a'; ctx.strokeRect(pr.x - 14, pr.y - 14, 28, 28); }
    else if (pr.kind === 'container') { ctx.fillStyle = '#c0392b'; ctx.fillRect(pr.x - 34, pr.y - 14, 68, 28); ctx.fillStyle = '#eaf2f8'; ctx.fillRect(pr.x - 34, pr.y - 14, 68, 5); }
    else if (pr.kind === 'umbrella') {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 16, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f5e6a8'; ctx.beginPath(); ctx.arc(pr.x, pr.y + 16, 10, 0, Math.PI); ctx.fill();
    } else if (pr.kind === 'crane') {
      ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x, pr.y - 90); ctx.lineTo(pr.x + 90, pr.y - 90); ctx.stroke();
    } else if (pr.kind === 'pond') {
      ctx.fillStyle = '#5dade2'; ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 70, 44, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Place labels.
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const key of ['bar', 'safehouse', 'hospital', 'station', 'port']) {
    const pl = PLACES[key];
    if (pl.x < cam.x - 80 || pl.x > cam.x + cam.w + 80 || pl.y < cam.y - 80 || pl.y > cam.y + cam.h + 80) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(pl.x - 52, pl.y - 34, 104, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(pl.label, pl.x, pl.y - 20);
  }
  // Mission marker (pulsing diamond + beam).
  const obj = state.objective;
  if (obj && obj.x) {
    const pulse = 1 + 0.18 * Math.sin(state.time * 5);
    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(16, 0); ctx.lineTo(0, 26); ctx.lineTo(-16, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,230,0,0.18)';
    ctx.fillRect(obj.x - 4, obj.y - 220, 8, 220);
  }
  // Safehouse marker.
  const sh = PLACES.safehouse;
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('⌂', sh.x, sh.y - 8);
  // Bullets.
  ctx.fillStyle = '#ffe600';
  for (const b of state.bullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  // Cars, peds, cops.
  for (const car of state.cars) drawCar(ctx, car);
  for (const ped of state.peds) {
    if (ped.hp <= 0) {
      ctx.fillStyle = '#555';
      ctx.beginPath(); ctx.ellipse(ped.x, ped.y, 12, 6, ped.angle, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, ped.skin, false, false, ped.hp);
  }
  for (const cop of state.cops) {
    if (cop.hp <= 0) continue;
    drawPerson(ctx, cop.x, cop.y, cop.angle, null, '#e0ac69', cop.isCop !== false, !!cop.isGang, cop.hp);
  }
  // Player.
  const p = state.player;
  if (!p.inCar && p.hp > 0) {
    const flash = p.hurtFlash > 0 && Math.floor(state.time * 12) % 2 === 0;
    drawPerson(ctx, p.x, p.y, p.angle, flash ? '#fff' : '#e74c3c', '#f1c27d', false, false, p.hp);
    // Aim line + punch arc.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.angle) * 34, p.y + Math.sin(p.angle) * 34); ctx.stroke();
    if (p.punchAnim > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, 10, p.angle - 0.9, p.angle + 0.9); ctx.stroke();
    }
  }
  // Player arrow.
  ctx.fillStyle = '#ffe600';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 30);
  ctx.lineTo(p.x - 7, p.y - 42); ctx.lineTo(p.x + 7, p.y - 42);
  ctx.closePath(); ctx.fill();
}

export function drawScreen(ctx, state, screen, vw, vh) {
  ctx.clearRect(0, 0, vw, vh);
  if (screen === SCREEN_TITLE) {
    // Draw the city behind the title.
    const cam = { x: 900, y: 500, w: vw, h: vh };
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    drawWorld(ctx, state, cam);
    ctx.restore();
    ctx.fillStyle = 'rgba(10,10,30,0.55)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('SOLMAR CITY', vw / 2, vh / 2 - 130);
    ctx.fillStyle = '#fff';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('An open-world crime story — sun, sea, sirens and one last score.', vw / 2, vh / 2 - 88);
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = '#d5dbdb';
    const lines = [
      'WASD / Arrows — walk & drive   •   Shift — run   •   E — enter / exit car',
      'F — punch   •   Mouse aim + click — shoot   •   Space — handbrake   •   P — pause   •   M — mute',
      'Steal cars, dodge the law, run six missions for Mama Rosa. Save at the safehouse (green ⌂).',
      '',
      'CLICK or press ENTER to start',
    ];
    lines.forEach((l, i) => ctx.fillText(l, vw / 2, vh / 2 - 40 + i * 26));
    return;
  }
  const cam = cameraFor(state, vw, vh);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  drawWorld(ctx, state, cam);
  ctx.restore();
  if (screen === SCREEN_PAUSE) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('PAUSED', vw / 2, vh / 2 - 10);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('P / Esc to resume — progress is saved at the safehouse (⌂)', vw / 2, vh / 2 + 30);
  }
  if (screen === SCREEN_OVER) {
    ctx.fillStyle = 'rgba(60,0,0,0.72)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText(state.over === 'busted' ? 'BUSTED!' : 'WASTED!', vw / 2, vh / 2 - 20);
    ctx.fillStyle = '#fff';
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText('Press ENTER to wake up and keep playing', vw / 2, vh / 2 + 24);
  }
}

/**
 * Point-cloud generators for the scroll-driven particle story.
 * Every generator returns exactly `n` xyz triples so shapes can morph 1:1.
 */

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

/* ─── Machines: three interlocking gears ──────────────── */

interface Gear { cx: number; cy: number; r: number; teeth: number; dir: number }

const GEARS: Gear[] = [
  { cx: -0.55, cy: 0.15, r: 1.25, teeth: 14, dir: 1 },
  { cx: 1.25, cy: -0.83, r: 0.72, teeth: 9, dir: -1.74 },
  { cx: 1.05, cy: 1.0, r: 0.48, teeth: 7, dir: -2.6 },
];

function gearOuter(g: Gear, theta: number) {
  // Smoothed square wave → trapezoidal teeth
  const w = Math.sin(theta * g.teeth);
  const tooth = Math.max(-1, Math.min(1, w * 3));
  return g.r + tooth * g.r * 0.1;
}

function insideGear(g: Gear, x: number, y: number) {
  const dx = x - g.cx, dy = y - g.cy;
  const r = Math.hypot(dx, dy);
  const th = Math.atan2(dy, dx);
  if (r > gearOuter(g, th)) return false;
  if (r > g.r * 0.68) return true; // rim
  if (r < g.r * 0.24 && r > g.r * 0.1) return true; // hub
  // five spokes
  const spoke = ((th + Math.PI) % ((Math.PI * 2) / 5)) - Math.PI / 5;
  return Math.abs(Math.sin(spoke) * r) < g.r * 0.07 && r > g.r * 0.1;
}

/** Returns positions plus a pivot attribute (cx, cy, angular speed) so each gear can spin on its own axle. */
export function gears(n: number) {
  const pos = new Float32Array(n * 3);
  const pivot = new Float32Array(n * 3);
  const areas = GEARS.map((g) => g.r * g.r);
  const total = areas.reduce((a, b) => a + b, 0);
  let i = 0;
  GEARS.forEach((g, gi) => {
    const count = gi === GEARS.length - 1 ? n - i : Math.round((areas[gi] / total) * n);
    for (let k = 0; k < count; k++, i++) {
      let x = 0, y = 0;
      if (Math.random() < 0.35) {
        // outline emphasis — crisp tooth silhouette
        const th = rand(0, Math.PI * 2);
        const r = gearOuter(g, th) - Math.random() * 0.03;
        x = g.cx + Math.cos(th) * r;
        y = g.cy + Math.sin(th) * r;
      } else {
        do {
          x = g.cx + rand(-1.12, 1.12) * g.r;
          y = g.cy + rand(-1.12, 1.12) * g.r;
        } while (!insideGear(g, x, y));
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = rand(-0.14, 0.14);
      pivot[i * 3] = g.cx;
      pivot[i * 3 + 1] = g.cy;
      pivot[i * 3 + 2] = g.dir;
    }
  });
  return { pos, pivot };
}

/* ─── Humans: a head-and-shoulders bust sampled from a canvas ── */

export function human(n: number) {
  const W = 256, H = 320;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(128, 92, 46, 56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(110, 130, 36, 56);
  ctx.beginPath();
  ctx.moveTo(14, 320);
  ctx.bezierCurveTo(16, 232, 50, 196, 104, 184);
  ctx.lineTo(152, 184);
  ctx.bezierCurveTo(206, 196, 240, 232, 242, 320);
  ctx.closePath();
  ctx.fill();

  const data = ctx.getImageData(0, 0, W, H).data;
  const filled: number[] = [];
  const edge: number[] = [];
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] > 128;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!on(x, y)) continue;
      filled.push(x, y);
      if (!on(x - 2, y) || !on(x + 2, y) || !on(x, y - 2) || !on(x, y + 2)) edge.push(x, y);
    }
  }

  const pos = new Float32Array(n * 3);
  const scale = 3.7 / H;
  for (let i = 0; i < n; i++) {
    const useEdge = Math.random() < 0.4 && edge.length;
    const src = useEdge ? edge : filled;
    const k = Math.floor(Math.random() * (src.length / 2)) * 2;
    const px = src[k] + Math.random(), py = src[k + 1] + Math.random();
    const x = (px - W / 2) * scale;
    const y = (H / 2 - py) * scale - 0.1;
    // Give the silhouette body: depth shrinks toward the outline
    const depth = useEdge ? 0.05 : 0.38;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = gauss() * depth;
  }
  return pos;
}

/* ─── Promise: an infinity loop (lemniscate tube) ──────── */

export function infinity(n: number) {
  const pos = new Float32Array(n * 3);
  const a = 2.35;
  for (let i = 0; i < n; i++) {
    const t = rand(0, Math.PI * 2);
    const s = Math.sin(t), co = Math.cos(t);
    const d = 1 + s * s;
    const cx = (a * co) / d;
    const cy = (a * s * co) / d;
    const tube = Math.random() < 0.12 ? 0.45 : 0.16;
    pos[i * 3] = cx + gauss() * tube;
    pos[i * 3 + 1] = cy + gauss() * tube;
    pos[i * 3 + 2] = Math.sin(t * 2) * 0.35 + gauss() * tube;
  }
  return pos;
}

/* ─── Purpose: a wireframe globe with an orbit ─────────── */

export function globe(n: number) {
  const pos = new Float32Array(n * 3);
  const R = 1.85;
  for (let i = 0; i < n; i++) {
    const m = Math.random();
    let x: number, y: number, z: number;
    if (m < 0.5) {
      // latitude / longitude lines
      if (Math.random() < 0.5) {
        const lat = (Math.floor(rand(1, 8)) / 8) * Math.PI - Math.PI / 2;
        const lon = rand(0, Math.PI * 2);
        x = R * Math.cos(lat) * Math.cos(lon); y = R * Math.sin(lat); z = R * Math.cos(lat) * Math.sin(lon);
      } else {
        const lon = (Math.floor(rand(0, 12)) / 12) * Math.PI * 2;
        const lat = rand(-Math.PI / 2, Math.PI / 2);
        x = R * Math.cos(lat) * Math.cos(lon); y = R * Math.sin(lat); z = R * Math.cos(lat) * Math.sin(lon);
      }
    } else if (m < 0.8) {
      // surface scatter
      const u = rand(-1, 1), th = rand(0, Math.PI * 2);
      const rr = Math.sqrt(1 - u * u);
      x = R * rr * Math.cos(th); y = R * u; z = R * rr * Math.sin(th);
    } else {
      // tilted orbit ring
      const th = rand(0, Math.PI * 2);
      const r = 2.55 + gauss() * 0.04;
      const ox = Math.cos(th) * r, oz = Math.sin(th) * r;
      const tilt = 0.42;
      x = ox; y = -oz * Math.sin(tilt); z = oz * Math.cos(tilt);
    }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
  }
  return pos;
}

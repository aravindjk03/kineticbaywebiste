/**
 * Point-cloud generators for the scroll-driven particle story.
 * Every generator returns exactly `n` xyz triples so shapes can morph 1:1.
 */

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

/** Sample fill + edge pixels from a canvas mask into a centred point cloud of the given height. */
function sampleMask(
  W: number, H: number, n: number,
  { height, edgeShare = 0.45, depth = 0.25, edgeDepth = 0.05, test }: {
    height: number; edgeShare?: number; depth?: number; edgeDepth?: number; test: (i: number) => boolean;
  },
) {
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && test((y * W + x) * 4);
  const fill: number[] = [], edge: number[] = [];
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      fill.push(x, y);
      if (!on(x - 2, y) || !on(x + 2, y) || !on(x, y - 2) || !on(x, y + 2)) edge.push(x, y);
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const pos = new Float32Array(n * 3);
  if (!fill.length) return pos;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const s = height / Math.max(1, maxY - minY);
  for (let i = 0; i < n; i++) {
    const useEdge = edge.length > 0 && Math.random() < edgeShare;
    const src = useEdge ? edge : fill;
    const k = Math.floor(Math.random() * (src.length / 2)) * 2;
    pos[i * 3] = (src[k] + Math.random() - cx) * s;
    pos[i * 3 + 1] = (cy - src[k + 1] - Math.random()) * s;
    pos[i * 3 + 2] = gauss() * (useEdge ? edgeDepth : depth);
  }
  return pos;
}

/* ─── Intro: the Kinetic Bay mark, traced from the real logo ── */

export function logo(n: number, img: HTMLImageElement) {
  const W = 420, H = 420;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  // drop the small tagline under the wordmark; it only turns into noise at particle scale
  ctx.clearRect(0, H * 0.71, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  // the brand orange: strong red, mid green, low blue
  const test = (i: number) => d[i + 3] > 120 && d[i] > 170 && d[i + 1] > 60 && d[i + 1] < 190 && d[i + 2] < 120;
  return sampleMask(W, H, n, { height: 2.1, edgeShare: 0.5, depth: 0.18, edgeDepth: 0.04, test });
}

/* ─── Machines: software + IoT — a chip running code, wired to devices ──
   Returns a start point, an end point and a flow speed per particle: static
   parts have start = end; "data packets" loop from start to end along traces. */

type V2 = [number, number];

export function machines(n: number) {
  const a = new Float32Array(n * 3);
  const b = new Float32Array(n * 3);
  const flow = new Float32Array(n * 2);

  // chip body and code glyph from a small canvas, so the </> reads as real type
  const W = 240, H = 240;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.roundRect(50, 50, 140, 140, 16); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(66, 66, 108, 108, 10); ctx.stroke();
  ctx.font = 'bold 64px "Space Grotesk", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('</>', 120, 124);
  ctx.lineWidth = 6;
  for (let k = 0; k < 5; k++) {
    const t = 72 + k * 24;
    ctx.beginPath(); ctx.moveTo(t, 50); ctx.lineTo(t, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t, 190); ctx.lineTo(t, 210); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(50, t); ctx.lineTo(30, t); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(190, t); ctx.lineTo(210, t); ctx.stroke();
  }
  const d = ctx.getImageData(0, 0, W, H).data;
  const CHIP = 1.5; // world units across
  const chipN = Math.floor(n * 0.4);
  const chip = sampleMask(W, H, chipN, { height: CHIP * (H / 140) * 0.72, edgeShare: 0.6, depth: 0.08, edgeDepth: 0.03, test: (i) => d[i + 3] > 128 });

  // circuit traces with right-angle bends, from the chip edge out to IoT devices
  const r = CHIP / 2 + 0.14;
  const traces: V2[][] = [
    [[r, 0.25], [1.3, 0.25], [1.6, 0.7], [2.2, 0.7]],
    [[r, -0.25], [1.2, -0.25], [1.5, -0.8], [2.1, -0.8]],
    [[-r, 0.25], [-1.25, 0.25], [-1.55, 0.75], [-2.15, 0.75]],
    [[-r, -0.25], [-1.3, -0.25], [-1.6, -0.75], [-2.2, -0.75]],
    [[0.25, r], [0.25, 1.25], [0.75, 1.6]],
    [[-0.25, -r], [-0.25, -1.25], [-0.75, -1.6]],
    [[-0.25, r], [-0.25, 1.35], [-0.85, 1.75]],
    [[0.25, -r], [0.25, -1.3], [0.85, -1.7]],
  ];
  const nodes = traces.map((t) => t[t.length - 1]);
  const segs: [V2, V2][] = traces.flatMap((t) => t.slice(1).map((p, k) => [t[k], p] as [V2, V2]));
  const segLen = segs.map(([p, q]) => Math.hypot(q[0] - p[0], q[1] - p[1]));
  const totalLen = segLen.reduce((x, y) => x + y, 0);
  const pickSeg = () => {
    let r0 = Math.random() * totalLen;
    for (let k = 0; k < segs.length; k++) { r0 -= segLen[k]; if (r0 <= 0) return k; }
    return segs.length - 1;
  };

  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0, x2: number, y2: number, speed = 0;
    if (i < chipN) {
      x = chip[i * 3]; y = chip[i * 3 + 1]; z = chip[i * 3 + 2];
      x2 = x; y2 = y;
    } else {
      const m = Math.random();
      if (m < 0.34) {
        // static trace copper
        const [p, q] = segs[pickSeg()];
        const t = Math.random();
        x = p[0] + (q[0] - p[0]) * t + gauss() * 0.012; y = p[1] + (q[1] - p[1]) * t + gauss() * 0.012;
        x2 = x; y2 = y;
      } else if (m < 0.56) {
        // data packets streaming outward along a segment
        const [p, q] = segs[pickSeg()];
        x = p[0]; y = p[1]; x2 = q[0]; y2 = q[1];
        speed = rand(0.25, 0.6);
      } else if (m < 0.8) {
        // IoT devices: ringed nodes
        const [nx, ny] = nodes[Math.floor(Math.random() * nodes.length)];
        const th = rand(0, Math.PI * 2);
        const rr = Math.random() < 0.6 ? 0.17 : Math.random() * 0.08;
        x = nx + Math.cos(th) * rr; y = ny + Math.sin(th) * rr;
        x2 = x; y2 = y;
      } else {
        // wireless signal arcs radiating from the outer devices
        const [nx, ny] = nodes[Math.floor(Math.random() * 4)];
        const dir = Math.atan2(ny, nx);
        const ring = 0.3 + Math.floor(Math.random() * 3) * 0.14;
        const th = dir + rand(-0.6, 0.6);
        x = nx + Math.cos(th) * ring; y = ny + Math.sin(th) * ring;
        x2 = x; y2 = y;
      }
      z = gauss() * 0.06;
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
    b[i * 3] = x2; b[i * 3 + 1] = y2; b[i * 3 + 2] = z;
    flow[i * 2] = speed;
    flow[i * 2 + 1] = Math.random();
  }
  return { a, b, flow };
}

/* ─── Humans: a real face in profile — brow, nose, lips, chin, eye and ear ── */

export function face(n: number) {
  const W = 300, H = 380;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;

  // silhouette, facing right
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(98, 380);
  ctx.bezierCurveTo(96, 335, 72, 300, 62, 252);
  ctx.bezierCurveTo(40, 182, 44, 92, 108, 46);
  ctx.bezierCurveTo(160, 10, 232, 20, 250, 72);
  ctx.bezierCurveTo(258, 92, 260, 110, 257, 126);
  ctx.bezierCurveTo(262, 133, 266, 139, 261, 147);
  ctx.bezierCurveTo(257, 154, 262, 162, 270, 177);
  ctx.bezierCurveTo(281, 193, 293, 205, 287, 212);
  ctx.bezierCurveTo(281, 219, 271, 216, 266, 221);
  ctx.bezierCurveTo(273, 227, 275, 233, 269, 237);
  ctx.bezierCurveTo(264, 239, 266, 242, 270, 246);
  ctx.bezierCurveTo(273, 253, 266, 257, 260, 259);
  ctx.bezierCurveTo(262, 267, 267, 278, 262, 289);
  ctx.bezierCurveTo(256, 301, 236, 307, 218, 307);
  ctx.bezierCurveTo(210, 330, 212, 360, 216, 380);
  ctx.closePath();
  ctx.fill();
  const sil = ctx.getImageData(0, 0, W, H).data;

  // facial features as strokes on a second pass
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(224, 139); ctx.quadraticCurveTo(242, 129, 256, 136); ctx.stroke(); // brow
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(233, 158); ctx.quadraticCurveTo(245, 150, 254, 157); ctx.quadraticCurveTo(245, 162, 233, 158); ctx.stroke(); // eye
  ctx.beginPath(); ctx.arc(247, 157, 2.6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); // iris
  ctx.beginPath(); ctx.moveTo(256, 205); ctx.quadraticCurveTo(262, 213, 270, 211); ctx.stroke(); // nostril
  ctx.beginPath(); ctx.moveTo(252, 241); ctx.lineTo(268, 241); ctx.stroke(); // mouth line
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(132, 158); ctx.bezierCurveTo(158, 140, 166, 196, 142, 210); ctx.stroke(); // ear
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(140, 170); ctx.bezierCurveTo(152, 166, 154, 190, 144, 196); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(150, 250); ctx.quadraticCurveTo(200, 300, 240, 300); ctx.stroke(); // jaw
  ctx.beginPath(); ctx.moveTo(248, 74); ctx.bezierCurveTo(200, 62, 146, 90, 122, 150); ctx.stroke(); // hairline
  ctx.beginPath(); ctx.moveTo(210, 175); ctx.quadraticCurveTo(222, 200, 238, 212); ctx.stroke(); // cheek
  const feat = ctx.getImageData(0, 0, W, H).data;

  // hair: a denser cap from the hairline back over the skull
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(250, 74);
  ctx.bezierCurveTo(200, 60, 146, 88, 124, 150);
  ctx.bezierCurveTo(112, 190, 96, 230, 70, 262);
  ctx.bezierCurveTo(44, 182, 46, 92, 108, 46);
  ctx.bezierCurveTo(160, 10, 232, 20, 250, 74);
  ctx.fill();
  const hair = ctx.getImageData(0, 0, W, H).data;

  const featN = Math.floor(n * 0.2);
  const hairN = Math.floor(n * 0.2);
  const silPts = sampleMask(W, H, n - featN - hairN, { height: 3.7, edgeShare: 0.55, depth: 0.32, edgeDepth: 0.04, test: (i) => sil[i + 3] > 128 });
  const featPts = sampleMask(W, H, featN, { height: 1, edgeShare: 0, depth: 0.02, test: (i) => feat[i + 3] > 128 });

  // features were sampled on the same canvas: re-anchor them into the silhouette's frame
  let minY = H, maxY = 0, minX = W, maxX = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (sil[(y * W + x) * 4 + 3] > 128) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const s = 3.7 / (maxY - minY), cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const pts: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (feat[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
  const hairPts: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (hair[(y * W + x) * 4 + 3] > 128) hairPts.push(x, y);
  const pos = new Float32Array(n * 3);
  pos.set(silPts, 0);
  const base = n - featN - hairN;
  for (let i = 0; i < hairN; i++) {
    const k = Math.floor(Math.random() * (hairPts.length / 2)) * 2;
    const j = (base + i) * 3;
    pos[j] = (hairPts[k] + Math.random() - cx) * s;
    pos[j + 1] = (cy - hairPts[k + 1] - Math.random()) * s;
    pos[j + 2] = gauss() * 0.3;
  }
  for (let i = 0; i < featN; i++) {
    const k = Math.floor(Math.random() * (pts.length / 2)) * 2;
    const j = (base + hairN + i) * 3;
    pos[j] = (pts[k] + Math.random() - cx) * s;
    pos[j + 1] = (cy - pts[k + 1] - Math.random()) * s;
    pos[j + 2] = 0.2 + featPts[i * 3 + 2]; // features sit slightly proud of the face
  }
  // offset so the face, not the back of the head, is centred
  for (let i = 0; i < n; i++) pos[i * 3] -= 0.25;
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
      const u = rand(-1, 1), th = rand(0, Math.PI * 2);
      const rr = Math.sqrt(1 - u * u);
      x = R * rr * Math.cos(th); y = R * u; z = R * rr * Math.sin(th);
    } else {
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

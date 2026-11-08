import * as THREE from "three";

/**
 * One set of parts, five arrangements. Every form writes the same 96 parts into
 * a Frame, so a transition is only ever these pieces travelling to new places.
 */
export const PARTS = 96;

export interface Frame {
  pos: Float32Array;
  size: Float32Array;
  rot: Float32Array;
  round: Float32Array;
  color: Float32Array;
}

export const makeFrame = (): Frame => ({
  pos: new Float32Array(PARTS * 3),
  size: new Float32Array(PARTS * 3),
  rot: new Float32Array(PARTS * 3),
  round: new Float32Array(PARTS),
  color: new Float32Array(PARTS * 3),
});

const rgb = (hex: number) => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b] as const;
};
const WHITE = rgb(0xffffff);
const PAPER = rgb(0xdfe7ff);
const PALE = rgb(0x9db8fb);
const NAVY = rgb(0x0d2052);
const INK = rgb(0x05070f);
type Color = typeof WHITE;

function put(
  f: Frame,
  i: number,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  round: number,
  c: Color,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  f.pos[i * 3] = x;
  f.pos[i * 3 + 1] = y;
  f.pos[i * 3 + 2] = z;
  f.size[i * 3] = sx;
  f.size[i * 3 + 1] = sy;
  f.size[i * 3 + 2] = sz;
  f.rot[i * 3] = rx;
  f.rot[i * 3 + 1] = ry;
  f.rot[i * 3 + 2] = rz;
  f.round[i] = round;
  f.color[i * 3] = c[0];
  f.color[i * 3 + 1] = c[1];
  f.color[i * 3 + 2] = c[2];
}

const ball = (f: Frame, i: number, x: number, y: number, z: number, d: number, c: Color) =>
  put(f, i, x, y, z, d, d, d, 1, c);

export type Link = readonly [number, number];

const TAU = Math.PI * 2;
const FLOOR = -2.3;

/* ---------------- Engineering: an arm stacking parts ---------------- */

const TRUSS_START = 25;
const TRUSS_COLUMNS = 12;
const GEAR_START = TRUSS_START + TRUSS_COLUMNS * 2;
const GEAR_TEETH = 18;
const DUST_START = GEAR_START + GEAR_TEETH;

export const ARM_LINKS: Link[] = (() => {
  const links: [number, number][] = [];
  for (let c = 0; c < TRUSS_COLUMNS; c++) {
    const low = TRUSS_START + c * 2;
    links.push([low, low + 1]);
    if (c < TRUSS_COLUMNS - 1) {
      links.push([low, low + 2], [low + 1, low + 3]);
      links.push(c % 2 ? [low, low + 3] : [low + 1, low + 2]);
    }
  }
  return links;
})();

export function arm(f: Frame, time: number) {
  const t = Math.max(0, time);
  const period = 2.6;
  const cycle = t / period;
  const placed = Math.floor(cycle);
  const phase = cycle - placed;
  const sweep = 0.5 - 0.5 * Math.cos(TAU * phase);
  const yaw = 1.05 - 2.1 * sweep;
  const raise = Math.sin(TAU * phase) ** 2;
  const reach = 2.15;

  const L1 = 1.75;
  const L2 = 1.55;
  const shoulderY = -1.35;
  const wristY = FLOOR + 0.82 + raise;
  const dy = wristY - shoulderY;
  const d = Math.min(L1 + L2 - 0.02, Math.hypot(reach, dy));
  const bend = Math.acos(
    Math.min(1, Math.max(-1, (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2))),
  );
  const upper = Math.atan2(dy, reach) + Math.atan2(L2 * Math.sin(bend), L1 + L2 * Math.cos(bend));
  const fore = upper - bend;
  const ex = L1 * Math.cos(upper);
  const ey = shoulderY + L1 * Math.sin(upper);
  const wx = ex + L2 * Math.cos(fore);
  const wy = ey + L2 * Math.sin(fore);

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const at = (r: number) => [r * cy, -r * sy] as const;

  put(f, 0, 0, FLOOR + 0.12, 0, 1.7, 0.24, 1.7, 0, WHITE, 0, yaw * 0.2);
  put(f, 1, 0, FLOOR + 0.5, 0, 0.92, 0.52, 0.92, 0, NAVY, 0, yaw);
  ball(f, 2, 0, shoulderY, 0, 0.62, INK);

  const segment = (from: number, count: number, r0: number, y0: number, r1: number, y1: number, angle: number, t0: number, t1: number) => {
    const len = Math.hypot(r1 - r0, y1 - y0) / count;
    for (let k = 0; k < count; k++) {
      const u = (k + 0.5) / count;
      const [x, z] = at(r0 + (r1 - r0) * u);
      const thick = t0 + (t1 - t0) * u;
      put(f, from + k, x, y0 + (y1 - y0) * u, z, len * 0.9, thick, thick, 0, k % 2 ? PAPER : WHITE, 0, yaw, angle);
    }
  };
  segment(3, 6, 0, shoulderY, ex, ey, upper, 0.44, 0.34);
  let [x, z] = at(ex);
  ball(f, 9, x, ey, z, 0.5, INK);
  segment(10, 5, ex, ey, wx, wy, fore, 0.32, 0.24);
  [x, z] = at(wx);
  ball(f, 15, x, wy, z, 0.36, INK);

  const carrying = phase < 0.5;
  const open = carrying ? 0.15 : 0.27;
  put(f, 16, x, wy - 0.26, z, 0.3, 0.14, 0.62, 0, NAVY, 0, yaw);
  for (const [i, side] of [[17, 1], [18, -1]] as const) {
    put(f, i, x - sy * side * open, wy - 0.5, z - cy * side * open, 0.12, 0.42, 0.08, 0, WHITE, 0, yaw);
  }

  // Cubes wait on the near side and leave one at a time for the tower.
  const placing = Math.min(5, placed);
  for (let j = 0; j < 6; j++) {
    const i = 19 + j;
    const size = 0.34;
    if (j < placing || (j === placing && !carrying)) {
      const [tx, tz] = [reach * Math.cos(-1.05), -reach * Math.sin(-1.05)];
      put(f, i, tx, FLOOR + size / 2 + j * size * 1.02, tz, size, size, size, 0, j % 2 ? NAVY : WHITE);
    } else if (j === placing) {
      put(f, i, x, wy - 0.68, z, size, size, size, 0, WHITE, 0, yaw);
    } else {
      const a = 1.05 + (j - placing - 1) * 0.2;
      put(f, i, reach * Math.cos(a), FLOOR + size / 2, -reach * Math.sin(a), size, size, size, 0, j % 2 ? NAVY : WHITE, 0, a);
    }
  }

  for (let c = 0; c < TRUSS_COLUMNS; c++) {
    const u = c / (TRUSS_COLUMNS - 1);
    const px = -3.7 + 7.4 * u;
    const arch = FLOOR + 0.3 + 2.5 * Math.sin(Math.PI * u) ** 0.8;
    ball(f, TRUSS_START + c * 2, px, arch, -2.1, 0.13, INK);
    ball(f, TRUSS_START + c * 2 + 1, px, arch + 0.62, -2.1, 0.13, INK);
  }

  for (let g = 0; g < GEAR_TEETH; g++) {
    const a = (g / GEAR_TEETH) * TAU + t * 0.5;
    put(f, GEAR_START + g, Math.cos(a) * 1.08, FLOOR + 0.1, -Math.sin(a) * 1.08, 0.2, 0.2, 0.12, 0, g % 2 ? WHITE : NAVY, 0, a);
  }

  for (let i = DUST_START; i < PARTS; i++) {
    const s = i - DUST_START;
    const a = s * 2.4 + t * 0.05;
    ball(f, i, Math.cos(a) * (2.6 + (s % 5) * 0.32), -0.3 + Math.sin(s * 1.7 + t * 0.3) * 1.9, Math.sin(a) * 2 - 0.4, 0.05, PALE);
  }
}

/* ---------------- Chemistry: fused rings, fragments that bond ---------------- */

interface Atom {
  x: number;
  y: number;
  z: number;
  d: number;
  c: Color;
}

const molecule = (() => {
  const a = 0.72;
  const atoms: Atom[] = [];
  const links: [number, number][] = [];
  const centers = [-Math.sqrt(3) * a, 0, Math.sqrt(3) * a];
  const find = (x: number, y: number) =>
    atoms.findIndex((p) => Math.hypot(p.x - x, p.y - y) < 0.05);
  for (const cx of centers) {
    const ring: number[] = [];
    for (let k = 0; k < 6; k++) {
      const ang = Math.PI / 6 + (k * Math.PI) / 3;
      const x = cx + Math.cos(ang) * a;
      const y = Math.sin(ang) * a;
      let idx = find(x, y);
      if (idx < 0) {
        atoms.push({ x, y, z: 0, d: 0.42, c: NAVY });
        idx = atoms.length - 1;
      }
      ring.push(idx);
    }
    ring.forEach((p, k) => {
      const q = ring[(k + 1) % 6];
      if (!links.some(([m, n]) => (m === p && n === q) || (m === q && n === p)))
        links.push([p, q]);
    });
  }
  const core = atoms.length;
  for (let i = 0; i < core; i++) {
    const p = atoms[i];
    const degree = links.filter(([m, n]) => m === i || n === i).length;
    if (degree > 2) continue;
    const mx = atoms.reduce((s, q) => s + q.x, 0) / core;
    const dir = Math.atan2(p.y, p.x - mx * 0);
    const nearest = centers.reduce((b, c) => (Math.abs(p.x - c) < Math.abs(p.x - b) ? c : b));
    const out = Math.atan2(p.y, p.x - nearest);
    const big = i % 3 === 0;
    atoms.push({
      x: p.x + Math.cos(out) * 0.72,
      y: p.y + Math.sin(out) * 0.72,
      z: (i % 2 ? 1 : -1) * 0.34 + dir * 0,
      d: big ? 0.48 : 0.26,
      c: big ? WHITE : PALE,
    });
    links.push([i, atoms.length - 1]);
  }
  return { atoms, links };
})();

const FRAGMENT_ANCHORS = [
  [-3.1, 1.25, 0.5],
  [3.1, -1.2, -0.3],
] as const;
const MOLECULE_FIXED = molecule.atoms.length;
const FRAGMENT_END = MOLECULE_FIXED + FRAGMENT_ANCHORS.length * 3;

export const MOLECULE_LINKS: Link[] = [
  ...molecule.links,
  ...FRAGMENT_ANCHORS.flatMap((_, n) => {
    const base = MOLECULE_FIXED + n * 3;
    return [
      [base, base + 1],
      [base, base + 2],
    ] as Link[];
  }),
];

export function chemistry(f: Frame, t: number) {
  const yaw = t * 0.28;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const tilt = 0.42;
  const place = (x: number, y: number, z: number) => {
    const rx = x * c + z * s;
    const rz = -x * s + z * c;
    return [rx, y * Math.cos(tilt) - rz * Math.sin(tilt) + 0.15, y * Math.sin(tilt) + rz * Math.cos(tilt)] as const;
  };
  molecule.atoms.forEach((p, i) => {
    const [x, y, z] = place(p.x, p.y, p.z);
    ball(f, i, x, y, z, p.d, p.c);
  });
  FRAGMENT_ANCHORS.forEach(([ax, ay, az], n) => {
    const base = MOLECULE_FIXED + n * 3;
    const pull = 0.6 + 0.4 * Math.sin(t * 0.9 + n * 2);
    const hx = ax * pull;
    const hy = ay * pull;
    const hz = az * pull;
    [[0, 0, 0, 0.44, INK], [0.55, 0.3, 0.1, 0.24, WHITE], [-0.5, 0.36, -0.1, 0.24, WHITE]].forEach((d, k) => {
      const [x, y, z] = place(hx + (d[0] as number), hy + (d[1] as number), hz + (d[2] as number));
      ball(f, base + k, x, y, z, d[3] as number, d[4] as Color);
    });
  });
  for (let i = FRAGMENT_END; i < PARTS; i++) {
    const k = i - FRAGMENT_END;
    const a = k * 0.72 + t * (0.5 + (k % 3) * 0.12);
    const r = 2.6 + (k % 3) * 0.55;
    const plane = (k % 3) * 1.05;
    const ex = Math.cos(a) * r;
    const ey = Math.sin(a) * r * 0.42;
    ball(f, i, ex * Math.cos(plane) - ey * Math.sin(plane), ex * Math.sin(plane) * 0.5 + ey * Math.cos(plane) + 0.1, Math.sin(a + plane) * 1.5, 0.06, PAPER);
  }
}

/* ---------------- Physics: an orbiting system ---------------- */

const PLANETS = [
  [1.5, 0.22, NAVY, 1.05],
  [2.3, 0.38, PALE, 0.74],
  [2.95, 0.56, NAVY, 0.52],
  [3.6, 0.32, INK, 0.4],
  [4.1, 0.46, WHITE, 0.3],
  [1.15, 0.13, INK, 1.5],
] as const;

const RING_POINTS = 21;
const RING_START = 11;
export const ORBIT_LINKS: Link[] = [0, 1, 2, 3].flatMap((ring) =>
  Array.from({ length: RING_POINTS }, (_, j) => [
    RING_START + j * 4 + ring,
    RING_START + ((j + 1) % RING_POINTS) * 4 + ring,
  ] as Link),
);

export function physics(f: Frame, t: number) {
  const lean = 0.33;
  const orbit = (r: number, a: number, y = 0) => {
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    return [px, y + 0.1 - pz * Math.sin(lean), pz * Math.cos(lean)] as const;
  };
  ball(f, 0, 0, 0.1, 0, 1.7, WHITE);
  PLANETS.forEach(([r, d, c, speed], n) => {
    const [x, y, z] = orbit(r, n * 1.9 + t * speed * 0.42);
    ball(f, n + 1, x, y, z, d, c as Color);
  });
  const big = orbit(PLANETS[2][0], 2 * 1.9 + t * PLANETS[2][3] * 0.42);
  for (let m = 0; m < 4; m++) {
    const a = m * 1.57 + t * 1.1;
    ball(f, 7 + m, big[0] + Math.cos(a) * 0.46, big[1] + Math.sin(a) * 0.12, big[2] + Math.sin(a) * 0.46, 0.07, PAPER);
  }
  const rings = [2.3, 2.95, 3.6, 4.1];
  for (let i = RING_START; i < PARTS; i++) {
    const k = i - RING_START;
    const ring = rings[k % 4];
    const j = Math.floor(k / 4);
    const [x, y, z] = orbit(ring, (j / RING_POINTS) * TAU + t * 0.05 * (k % 4 ? 1 : -1));
    ball(f, i, x, y, z, j % 3 ? 0.03 : 0.075, j % 3 ? PALE : WHITE);
  }
}

/* ---------------- Biology: a living cell ---------------- */

const MEMBRANE_START = 31;
export const CELL_LINKS: Link[] = Array.from({ length: 18 }, (_, k) => [
  1 + (k % 14),
  MEMBRANE_START + k * 3,
]);

export function biology(f: Frame, t: number) {
  const yaw = t * 0.18;
  const rotate = (x: number, y: number, z: number) =>
    [x * Math.cos(yaw) + z * Math.sin(yaw), y + 0.05, -x * Math.sin(yaw) + z * Math.cos(yaw)] as const;
  const breath = 1 + 0.035 * Math.sin(t * 1.1);
  ball(f, 0, 0, 0.05, 0, 1.25 * breath, NAVY);
  for (let k = 0; k < 14; k++) {
    const a = k * 2.399;
    const lat = Math.acos(1 - (2 * (k + 0.5)) / 14);
    const r = 0.74 * breath;
    const [x, y, z] = rotate(r * Math.sin(lat) * Math.cos(a), r * Math.cos(lat), r * Math.sin(lat) * Math.sin(a));
    ball(f, 1 + k, x, y, z, 0.13, PALE);
  }
  for (let k = 0; k < 16; k++) {
    const a = k * 1.7 + t * 0.2;
    const r = 1.35 + (k % 3) * 0.2;
    const h = Math.sin(k * 2.1) * 1.1;
    const [x, y, z] = rotate(Math.cos(a) * r, h + Math.sin(t + k) * 0.05, Math.sin(a) * r);
    put(f, 15 + k, x, y, z, 0.5, 0.2, 0.2, 1, k % 2 ? WHITE : PALE, 0, -a - yaw, k * 0.5);
  }
  const shell = PARTS - MEMBRANE_START;
  for (let k = 0; k < shell; k++) {
    const a = k * 2.399963;
    const lat = Math.acos(1 - (2 * (k + 0.5)) / shell);
    const ripple = 1 + 0.03 * Math.sin(lat * 5 + t * 1.3) * Math.cos(a * 2 + t * 0.6);
    const r = 2.02 * ripple;
    const [x, y, z] = rotate(r * Math.sin(lat) * Math.cos(a), r * Math.cos(lat), r * Math.sin(lat) * Math.sin(a));
    ball(f, MEMBRANE_START + k, x, y, z, k % 4 ? 0.22 : 0.3, k % 3 ? WHITE : PAPER);
  }
}

/* ---------------- Computer science: a board carrying signal ---------------- */

const PAD_START = 17;
const COLS = 10;
const ROWS = 4;
const STREAM_START = PAD_START + COLS * ROWS;
const padIndex = (c: number, r: number) => PAD_START + c + r * COLS;

const padX = (col: number) => -4.05 + (8.1 * col) / (COLS - 1);
const padZ = (row: number) => -1.8 + (3.6 * row) / (ROWS - 1);

/** Pin number to its spot on the chip's edge, shared with the links below. */
function pinSpot(p: number) {
  const side = Math.floor(p / 4);
  const u = ((p % 4) + 0.5) / 4 - 0.5;
  const o = 0.98;
  return [
    side === 0 ? u * 1.5 : side === 1 ? o : side === 2 ? -u * 1.5 : -o,
    side === 0 ? -o : side === 1 ? u * 1.5 : side === 2 ? o : -u * 1.5,
  ] as const;
}

// Traces run along the grid, as on a real board: nothing cuts corners.
export const CIRCUIT_LINKS: Link[] = (() => {
  const links: [number, number][] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 1; c++)
      if ((c + r * 2) % 3 !== 2) links.push([padIndex(c, r), padIndex(c + 1, r)]);
  for (let c = 0; c < COLS; c += 2)
    for (let r = 0; r < ROWS - 1; r++)
      if ((c + r) % 4 !== 3 && Math.abs(padX(c)) > 1.3)
        links.push([padIndex(c, r), padIndex(c, r + 1)]);
  // Chip pins reach only the pad straight out from them.
  for (let p = 0; p < 16; p++) {
    const [px, pz] = pinSpot(p);
    const row = Math.abs(pz) > 0.9 ? (pz < 0 ? 0 : ROWS - 1) : pz < 0 ? 1 : 2;
    let col = 0;
    for (let c = 1; c < COLS; c++)
      if (Math.abs(padX(c) - px) < Math.abs(padX(col) - px)) col = c;
    const straightVertical = Math.abs(pz) > 0.9 && p % 4 === 1;
    const straightSide = Math.abs(px) > 0.9 && (p % 4 === 1 || p % 4 === 2);
    if (straightVertical || straightSide) links.push([1 + p, padIndex(col, row)]);
  }
  return links;
})();

export function computing(f: Frame, t: number) {
  const tilt = 1.02;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const board = (x: number, h: number, z: number) =>
    [x, h * c - z * s + 0.05, h * s + z * c] as const;
  const [cx, cy, cz] = board(0, 0.1, 0);
  put(f, 0, cx, cy, cz, 1.6, 0.2, 1.6, 0, NAVY, tilt);
  for (let p = 0; p < 16; p++) {
    const [px, pz] = pinSpot(p);
    const [x, y, z] = board(px, 0.04, pz);
    put(f, 1 + p, x, y, z, 0.14, 0.06, 0.14, 0, WHITE, tilt);
  }
  const wave = ((t * 2.4) % 11) - 5.5;
  for (let r = 0; r < ROWS; r++)
    for (let col = 0; col < COLS; col++) {
      const px = padX(col);
      const pz = padZ(r);
      const pulse = Math.exp(-((px - wave) ** 2) * 1.1);
      const d = 0.2 + pulse * 0.12;
      const [x, y, z] = board(px, 0.05 + pulse * 0.1, pz);
      put(f, padIndex(col, r), x, y, z, d, 0.1 + pulse * 0.1, d, 0.25, pulse > 0.4 ? WHITE : (col + r) % 3 ? PALE : NAVY, tilt);
    }
  const lanes = [-2.35, -1.2, 1.2, 2.35];
  for (let i = STREAM_START; i < PARTS; i++) {
    const k = i - STREAM_START;
    const lane = lanes[k % 4];
    const len = 0.16 + ((k * 7) % 5) * 0.09;
    const speed = 0.8 + (k % 4) * 0.25;
    const px = (((k * 1.13 + t * speed * (k % 2 ? 1 : -1)) % 9) + 9) % 9;
    const [x, y, z] = board(px - 4.5, 0.04, lane);
    put(f, i, x, y, z, len, 0.05, 0.07, 0, k % 3 ? WHITE : PALE, tilt);
  }
}

export const FORMS = [arm, chemistry, physics, biology, computing] as const;
export const LINKS: Link[][] = [ARM_LINKS, MOLECULE_LINKS, ORBIT_LINKS, CELL_LINKS, CIRCUIT_LINKS];
/** Bonds are thick, orbits and cell fibres hairline. */
export const LINK_WIDTH = [0.05, 0.075, 0.016, 0.018, 0.045];
export const LINK_CAPACITY = Math.max(...LINKS.map((l) => l.length));

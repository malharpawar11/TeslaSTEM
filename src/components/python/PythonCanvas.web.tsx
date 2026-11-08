import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ink, palette } from "@/theme/tokens";
import type { PythonSceneProps, SaddleClub, TitleBox } from "./types";

/**
 * The Pythons' python. It threads through the HTML title: an invisible copy of
 * the letters is written to the depth buffer, so where the body dips behind
 * z = 0 the real type below the canvas shows through and hides it. Every
 * marking on its back is a club.
 */

const FOV = 24;
const CAMERA_Z = 30;
const TWO_PI = Math.PI * 2;
const damp = THREE.MathUtils.damp;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);

function lowPowerDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
}

function worldSize(aspect: number) {
  const h = 2 * Math.tan((FOV * Math.PI) / 360) * CAMERA_Z;
  return { h, w: h * aspect };
}

/** Way-points in title units: x in ems, y in lines, z in ems toward camera. */
function buildPath(
  title: TitleBox,
  placement: PythonSceneProps["placement"],
  px: { width: number; height: number },
) {
  const world = worldSize(px.width / Math.max(1, px.height));
  const em = (title.size / px.height) * world.h;
  const at = (u: number, v: number, z: number) =>
    new THREE.Vector3(
      ((title.left + u * title.size) / px.width - 0.5) * world.w,
      (0.5 - (title.top + (v + 0.5) * title.lineHeight) / px.height) * world.h,
      z * em,
    );
  const entry: [number, number, number] = [
    -(title.left + title.size * 0.8) / title.size,
    0.52,
    0,
  ];
  // Across the gap under TESLA, ducking behind and over its letters.
  const thread: [number, number, number][] = [
    entry,
    [0.08, 0.5, 0.14],
    [0.5, 0.34, -0.3],
    [1.02, 0.58, 0.24],
    [1.56, 0.34, -0.3],
    [2.1, 0.6, -0.3],
  ];
  let rest: [number, number, number][];
  if (placement === "side") {
    const reach = title.right / title.size;
    const x = (a: number) => 2.3 + (reach - 2.3) * a;
    rest = [
      [x(0.06), 1.2, 0.05],
      [x(0.22), 2.3, 0.7],
      [x(0.62), 2.55, 0.5],
      [x(0.92), 1.95, -0.1],
      [x(0.6), 1.28, -0.35],
      [x(0.48), 0.72, 0.1],
      [x(0.86), 0.42, 0.6],
      [x(0.74), 0.02, 0.95],
      [x(0.42), 0.16, 1.1],
    ];
  } else {
    rest = [
      [2.5, 1.5, 0.45],
      [2.2, 3.15, 0.6],
      [1.2, 3.1, 0.25],
      [0.32, 3.45, 0.3],
      [0.62, 4.45, 0.55],
      [1.5, 4.5, 0.75],
    ];
  }
  const points = [...thread, ...rest].map(([u, v, z]) => at(u, v, z));
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const samples = curve.getSpacedPoints(900);
  const length = curve.getLength();
  // The tail rests just inside the first letter rather than off-screen.
  const entryLength = at(entry[0], entry[1], 0).distanceTo(at(0.05, 0.5, 0));
  return {
    em,
    samples,
    length,
    bodyLength: length - entryLength,
    world,
  };
}

/** Silhouette of the title for the depth pass, aligned to the HTML pixels. */
function useLetterMask(title: TitleBox, px: { width: number; height: number }) {
  const invalidate = useThree((s) => s.invalidate);
  // Sized before the first upload: WebGL can't resize this texture later.
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(4096, Math.round(px.width * 2));
    canvas.height = Math.min(4096, Math.round(px.height * 2));
    const t = new THREE.CanvasTexture(canvas);
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    return t;
  }, [px.width, px.height]);
  useEffect(() => {
    let alive = true;
    const font = `800 ${title.size * 2}px BigShoulders`;
    void document.fonts.load(font).then(() => {
      if (!alive) return;
      const canvas = texture.image as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      const sx = canvas.width / px.width;
      const sy = canvas.height / px.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      ctx.font = `800 ${title.size}px BigShoulders`;
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "alphabetic";
      const metrics = ctx.measureText("TESLA");
      const ascent = metrics.fontBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent;
      title.lines.forEach((line, i) => {
        const y =
          title.top +
          i * title.lineHeight +
          (title.lineHeight - (ascent + descent)) / 2 +
          ascent;
        ctx.fillText(line, title.left + (i === 1 ? title.indent : 0), y);
      });
      texture.needsUpdate = true;
      invalidate();
    });
    return () => {
      alive = false;
    };
  }, [title, px.width, px.height, texture, invalidate]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Soft panels for the skin to reflect. */
function Studio({ isDark }: { isDark: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new THREE.Scene();
    room.background = new THREE.Color(isDark ? 0x07080a : 0xc8ccd2);
    const panel = (
      color: THREE.ColorRepresentation,
      power: number,
      size: [number, number],
      position: [number, number, number],
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(...size),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(color).multiplyScalar(power),
          side: THREE.DoubleSide,
        }),
      );
      mesh.position.set(...position);
      mesh.lookAt(0, 0, 0);
      room.add(mesh);
    };
    panel(0xffffff, 10, [14, 4], [0, 10, 7]);
    panel(0xffffff, 3, [3, 12], [-10, 0, 6]);
    panel(ink.blue, 12, [3, 14], [10, -2, 3]);
    const target = pmrem.fromScene(room, 0.02);
    scene.environment = target.texture;
    invalidate();
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      room.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          node.material.dispose();
        }
      });
    };
  }, [gl, scene, isDark, invalidate]);
  return null;
}

const SKIN_W = 2048;
const SKIN_H = 512;
const SADDLE_START = 0.05;

function saddleSpan(headU: number) {
  return headU - 0.015 - SADDLE_START;
}

/** Tile of overlapping scales, reused for colour shading and for bump. */
function scaleLayer() {
  const canvas = document.createElement("canvas");
  canvas.width = SKIN_W;
  canvas.height = SKIN_H;
  const ctx = canvas.getContext("2d")!;
  const stepX = 6;
  const stepY = 13;
  for (let x = 0, col = 0; x < SKIN_W + stepX; x += stepX, col++) {
    for (let y = col % 2 ? -stepY / 2 : 0; y < SKIN_H + stepY; y += stepY) {
      ctx.beginPath();
      ctx.moveTo(x - stepX * 0.62, y);
      ctx.lineTo(x, y - stepY * 0.5);
      ctx.lineTo(x + stepX * 0.62, y);
      ctx.lineTo(x, y + stepY * 0.5);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.34)";
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  }
  return canvas;
}

function paintSkin(
  ctx: CanvasRenderingContext2D,
  clubs: SaddleClub[],
  lit: Set<string>,
  headU: number,
  scales: HTMLCanvasElement,
) {
  const W = SKIN_W;
  const H = SKIN_H;
  // v = 0.5 runs down the spine; the seam is hidden under the belly.
  const ground = ctx.createLinearGradient(0, 0, 0, H);
  ground.addColorStop(0, "#DDE8C4");
  ground.addColorStop(0.16, palette.green[700]);
  ground.addColorStop(0.5, palette.green[500]);
  ground.addColorStop(0.84, palette.green[700]);
  ground.addColorStop(1, "#DDE8C4");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, H);

  const span = saddleSpan(headU);
  const count = clubs.length;
  const pitch = (span / count) * W;
  const blot = (x: number, y: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TWO_PI);
    ctx.fill();
  };
  // Seeded by position, so every load draws the same animal.
  const wobble = (i: number, salt: number) => {
    const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  clubs.forEach((club, i) => {
    const x = (SADDLE_START + ((i + 0.5) / count) * span) * W;
    const y = H * (0.5 + (wobble(i, 1) - 0.5) * 0.05);
    const rx = pitch * (0.27 + wobble(i, 2) * 0.13);
    const ry = H * (0.13 + wobble(i, 3) * 0.08);
    const skew = (wobble(i, 4) - 0.5) * 0.06;
    const shape = (cx: number, cy: number, a: number, b: number) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, a, b, skew, 0, TWO_PI);
      ctx.fill();
    };
    // A saddle and the broken lobes either side of it.
    ctx.fillStyle = "#050D26";
    shape(x, y, rx * 1.3, ry * 1.14);
    shape(x + rx * 0.2, y - ry * 1.2, rx * 0.8, ry * 0.44);
    shape(x - rx * 0.2, y + ry * 1.2, rx * 0.8, ry * 0.44);
    ctx.fillStyle = lit.has(club.id) ? "#FFFFFF" : palette.blue[600];
    shape(x, y, rx, ry);
    if (!lit.has(club.id)) {
      ctx.fillStyle = ink.blue;
      shape(x, y, rx * 0.6, ry * 0.62);
    }
    // Flank spots between saddles.
    ctx.fillStyle = "#050D26";
    [0.2, 0.8].forEach((fy, n) =>
      blot(x + pitch / 2, H * (fy + (wobble(i, 5 + n) - 0.5) * 0.04), pitch * 0.17, H * 0.04),
    );
  });

  // Narrow arrowhead on the crown.
  const hx = headU * W;
  const hl = W - hx;
  ctx.fillStyle = "#07122F";
  ctx.beginPath();
  ctx.moveTo(hx + hl * 0.04, H * 0.38);
  ctx.quadraticCurveTo(hx + hl * 0.46, H * 0.43, hx + hl * 0.78, H * 0.5);
  ctx.quadraticCurveTo(hx + hl * 0.46, H * 0.57, hx + hl * 0.04, H * 0.62);
  ctx.quadraticCurveTo(hx + hl * 0.26, H * 0.5, hx + hl * 0.04, H * 0.38);
  ctx.fill();

  ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(scales, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

function Snake(props: PythonSceneProps) {
  const { clubs, lit, isDark, placement, title, pulseKey, scroll, still, onHover } = props;
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const setDpr = useThree((s) => s.setDpr);
  const invalidate = useThree((s) => s.invalidate);
  const scene = useThree((s) => s.scene);

  const low = useMemo(lowPowerDevice, []);
  const bodyRings = low ? 80 : 130;
  const headRings = low ? 14 : 22;
  const rings = bodyRings + headRings;
  const sides = low ? 10 : 16;

  const path = useMemo(
    () => buildPath(title, placement, size),
    [title, placement, size],
  );
  const headLength = path.em * (placement === "side" ? 1.02 : 0.86);
  const headU = 1 - headLength / path.bodyLength;
  const maxRadius = path.em * (placement === "side" ? 0.165 : 0.14);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = rings * (sides + 1);
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    const index: number[] = [];
    for (let r = 0; r < rings - 1; r++) {
      for (let s = 0; s < sides; s++) {
        const a = r * (sides + 1) + s;
        const b = a + sides + 1;
        index.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    g.setIndex(index);
    return g;
  }, [rings, sides]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Distance back from the snout for each ring; head rings sit closer.
  const ringD = useMemo(() => {
    const d = new Float32Array(rings);
    for (let i = 0; i < headRings; i++)
      d[rings - 1 - i] = headLength * (i / headRings);
    for (let i = 0; i < bodyRings; i++) {
      const f = i / (bodyRings - 1);
      d[i] = path.bodyLength - (path.bodyLength - headLength) * f;
    }
    return d;
  }, [rings, headRings, bodyRings, headLength, path.bodyLength]);

  // Texture coordinates never change, only positions do.
  useEffect(() => {
    const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
    for (let r = 0; r < rings; r++)
      for (let s = 0; s <= sides; s++)
        uv.setXY(r * (sides + 1) + s, 1 - ringD[r] / path.bodyLength, s / sides);
    uv.needsUpdate = true;
  }, [geometry, ringD, rings, sides, path.bodyLength]);

  const skin = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = SKIN_W;
    canvas.height = SKIN_H;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const scales = scaleLayer();
    const bump = new THREE.CanvasTexture(scales);
    return { canvas, ctx: canvas.getContext("2d")!, map, bump, scales };
  }, []);
  useEffect(
    () => () => {
      skin.map.dispose();
      skin.bump.dispose();
    },
    [skin],
  );
  useEffect(() => {
    paintSkin(skin.ctx, clubs, lit, headU, skin.scales);
    skin.map.needsUpdate = true;
    invalidate();
  }, [skin, clubs, lit, headU, invalidate]);

  const mask = useLetterMask(title, size);
  const maskMesh = useRef<THREE.Mesh>(null);
  const eyes = useRef<(THREE.Mesh | null)[]>([]);
  const nostrils = useRef<(THREE.Mesh | null)[]>([]);
  const tongue = useRef<THREE.Group>(null);
  const timeline = useRef({
    t: still ? 99 : -0.5,
    pulse: -1,
    key: pulseKey,
    look: new THREE.Vector2(),
    hover: -1,
    frames: 0,
    sum: 0,
    dropped: false,
  });
  const scratch = useMemo(
    () => ({
      c: new THREE.Vector3(),
      t: new THREE.Vector3(),
      n: new THREE.Vector3(),
      b: new THREE.Vector3(),
      a: new THREE.Vector3(),
      view: new THREE.Vector3(0, 0, 1),
      centers: Array.from({ length: rings }, () => new THREE.Vector3()),
    }),
    [rings],
  );

  const sampleAt = (s: number, out: THREE.Vector3) => {
    const { samples, length } = path;
    const x = clamp01(s / length) * (samples.length - 1);
    const i = Math.min(samples.length - 2, Math.floor(x));
    return out.copy(samples[i]).lerp(samples[i + 1], x - i);
  };

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const tl = timeline.current;
    if (!still) tl.t += dt;
    const t = tl.t;
    // On phones the controls sit below the python, so it has to stay put while
    // the student scrolls down to them; retreating would leave a blank gap.
    const p = still || placement === "stacked" ? 0 : clamp01(scroll.current);

    if (!still && t > 4 && !tl.dropped) {
      tl.sum += rawDelta;
      if (++tl.frames === 90) {
        if (tl.sum / 90 > 1 / 32) {
          tl.dropped = true;
          setDpr(1);
        }
        tl.frames = 0;
        tl.sum = 0;
      }
    }

    if (tl.key !== pulseKey) {
      tl.key = pulseKey;
      tl.pulse = 0;
    }
    if (tl.pulse >= 0) {
      tl.pulse += dt * 0.75;
      if (tl.pulse > 1.3) tl.pulse = -1;
    }

    // Keep the letter mask glued to the screen whatever the camera does.
    const drift = still ? 0 : 1;
    camera.position.set(
      Math.sin(t * 0.14) * 0.35 * drift,
      Math.cos(t * 0.1) * 0.2 * drift,
      CAMERA_Z,
    );
    camera.lookAt(0, 0, 0);
    if (maskMesh.current) {
      maskMesh.current.position.set(0, 0, -CAMERA_Z).applyQuaternion(camera.quaternion).add(camera.position);
      maskMesh.current.quaternion.copy(camera.quaternion);
    }

    const travel = easeOut((t - 0.5) / 3.6);
    const full = path.length;
    const head = THREE.MathUtils.lerp(
      path.bodyLength * 0.02,
      full,
      travel,
    ) - p * path.bodyLength * 1.02;

    tl.look.x = damp(tl.look.x, still ? 0 : state.pointer.x, 3, dt);
    tl.look.y = damp(tl.look.y, still ? 0 : state.pointer.y, 3, dt);

    const { c, t: tan, n, b, a, view, centers } = scratch;
    const settled = smooth(3.2, 4.4, t) * (1 - p);
    for (let r = 0; r < rings; r++) {
      const d = ringD[r];
      sampleAt(head - d, c);
      const f = 1 - d / path.bodyLength;
      // Living motion stays clear of the threaded section so letters still
      // overlap the body in the right places.
      const free = smooth(0.42, 0.62, f);
      const wave = Math.sin(f * 15 - t * 0.9) * free * settled * path.em * 0.05;
      const neck = smooth(0.76, 1, f);
      c.x += tl.look.x * neck * path.em * 0.4 * settled;
      c.y += tl.look.y * neck * path.em * 0.28 * settled + wave;
      centers[r].copy(c);
    }

    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const nor = geometry.getAttribute("normal") as THREE.BufferAttribute;
    for (let r = 0; r < rings; r++) {
      const here = centers[r];
      tan.copy(centers[Math.min(rings - 1, r + 1)]).sub(centers[Math.max(0, r - 1)]).normalize();
      // Spine faces the viewer so the markings are always on show.
      n.copy(view).addScaledVector(tan, -view.dot(tan)).normalize();
      b.crossVectors(tan, n).normalize();

      const d = ringD[r];
      const f = 1 - d / path.bodyLength;
      let radiusA = maxRadius * Math.pow(smooth(-0.02, 0.5, f), 0.8);
      radiusA = Math.max(radiusA, 0.0001);
      let radiusB = radiusA * 0.86;
      if (d < headLength) {
        const x = 1 - d / headLength; // 0 at neck, 1 at snout
        const neckR = maxRadius * 0.62;
        const jaw = maxRadius * 1.5;
        const width =
          x < 0.4
            ? THREE.MathUtils.lerp(neckR, jaw, smooth(0, 0.4, x))
            : THREE.MathUtils.lerp(jaw, maxRadius * 0.5, smooth(0.4, 0.94, x));
        const cap = Math.sqrt(clamp01((1 - x) / 0.09));
        radiusA = Math.max(0.0001, width * Math.min(1, cap));
        radiusB = Math.max(0.0001, THREE.MathUtils.lerp(neckR * 0.9, maxRadius * 0.34, x) * Math.min(1, cap));
      } else {
        // Narrow slightly into the neck.
        const toNeck = smooth(headLength * 2.4, headLength, d);
        radiusA = THREE.MathUtils.lerp(radiusA, maxRadius * 0.62, toNeck);
        radiusB = THREE.MathUtils.lerp(radiusB, maxRadius * 0.56, toNeck);
      }
      if (tl.pulse >= 0) {
        const g = (f - tl.pulse) / 0.05;
        const bulge = 1 + 0.32 * Math.exp(-g * g);
        radiusA *= bulge;
        radiusB *= bulge;
      }
      if (tl.hover >= 0) {
        const span = saddleSpan(headU);
        const centre = SADDLE_START + ((tl.hover + 0.5) / clubs.length) * span;
        const g = (f - centre) / (span / clubs.length);
        const bulge = 1 + 0.2 * Math.exp(-g * g);
        radiusA *= bulge;
        radiusB *= bulge;
      }
      for (let s = 0; s <= sides; s++) {
        const th = (s / sides - 0.5) * TWO_PI;
        const co = Math.cos(th);
        const si = Math.sin(th);
        a.copy(here).addScaledVector(n, co * radiusB).addScaledVector(b, si * radiusA);
        const v = r * (sides + 1) + s;
        pos.setXYZ(v, a.x, a.y, a.z);
        a.set(0, 0, 0).addScaledVector(n, co / radiusB).addScaledVector(b, si / radiusA).normalize();
        nor.setXYZ(v, a.x, a.y, a.z);
      }

      // Features ride on specific head rings.
      if (d < headLength) {
        const x = 1 - d / headLength;
        const place = (obj: THREE.Object3D | null | undefined, side: number, along: number, out: number, up: number) => {
          if (!obj) return;
          obj.position.copy(here).addScaledVector(b, side * out * radiusA).addScaledVector(n, up * radiusB);
        };
        const near = (target: number) => Math.abs(x - target) < 0.5 / headRings + 0.012;
        if (near(0.56)) {
          [-1, 1].forEach((side, i) => place(eyes.current[i], side, 0, 0.76, 0.5));
        }
        if (near(0.88)) {
          [-1, 1].forEach((side, i) => place(nostrils.current[i], side, 0, 0.42, 0.72));
        }
      }
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
    geometry.computeBoundingSphere();

    if (tongue.current) {
      const tip = centers[rings - 1];
      tongue.current.position.copy(tip);
      tan.copy(centers[rings - 1]).sub(centers[rings - 3]).normalize();
      tongue.current.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tan);
      const flickT = (t % 5.2) / 0.7;
      const out = still || t < 4 || flickT > 1 ? 0 : Math.sin(flickT * Math.PI);
      const scale = out * path.em * 0.26;
      tongue.current.scale.set(Math.max(scale, 0.0001), path.em * 0.5, path.em * 0.5);
    }

    // Hover: nearest point of the body under the cursor, in screen space.
    if (!still && settled > 0.5) {
      let best = -1;
      let bestDist = 0.0028;
      const aspect = size.width / Math.max(1, size.height);
      for (let r = 0; r < rings - headRings; r += 2) {
        a.copy(centers[r]).project(camera);
        const dx = (a.x - state.pointer.x) * aspect;
        const dy = a.y - state.pointer.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = r;
        }
      }
      let next = -1;
      if (best >= 0) {
        const f = 1 - ringD[best] / path.bodyLength;
        const i = Math.floor(((f - SADDLE_START) / saddleSpan(headU)) * clubs.length);
        if (i >= 0 && i < clubs.length) next = i;
      }
      if (next !== tl.hover) {
        tl.hover = next;
        onHover(next >= 0 ? clubs[next] : null);
        document.body.style.cursor = next >= 0 ? "pointer" : "";
      }
    }
    (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 1;
  });

  useEffect(() => invalidate(), [lit, title, invalidate]);
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );

  // Clicking selects whichever saddle the cursor is over.
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const click = () => {
      const i = timeline.current.hover;
      if (i >= 0) props.onSelect(clubs[i]);
    };
    el.addEventListener("click", click);
    return () => el.removeEventListener("click", click);
  }, [gl, clubs, props.onSelect]);

  const eyeR = maxRadius * 0.17;
  const world = path.world;
  return (
    <>
      <mesh ref={maskMesh} renderOrder={-1}>
        <planeGeometry args={[world.w, world.h]} />
        <meshBasicMaterial map={mask} alphaTest={0.5} colorWrite={false} toneMapped={false} />
      </mesh>
      <mesh geometry={geometry} frustumCulled={false}>
        <meshStandardMaterial
          map={skin.map}
          bumpMap={skin.bump}
          bumpScale={0.7}
          roughness={0.3}
          metalness={0.08}
          envMapIntensity={isDark ? 1.15 : 0.9}
        />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => (eyes.current[i] = m)} frustumCulled={false}>
          <sphereGeometry args={[eyeR, 18, 14]} />
          <meshStandardMaterial color={0x050505} roughness={0.06} metalness={0.2} />
        </mesh>
      ))}
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => (nostrils.current[i] = m)} frustumCulled={false}>
          <sphereGeometry args={[eyeR * 0.26, 8, 6]} />
          <meshBasicMaterial color={0x06100a} />
        </mesh>
      ))}
      <group ref={tongue}>
        <mesh position={[0.5, 0, 0]}>
          <boxGeometry args={[1, 0.018, 0.018]} />
          <meshBasicMaterial color={ink.blue} toneMapped={false} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[1.12, side * 0.03, 0]} rotation={[0, 0, side * 0.5]}>
            <boxGeometry args={[0.28, 0.014, 0.014]} />
            <meshBasicMaterial color={ink.blue} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </>
  );
}

export default function PythonCanvas(props: PythonSceneProps) {
  const low = useMemo(lowPowerDevice, []);
  return (
    <Canvas
      frameloop={props.active && !props.still ? "always" : "demand"}
      dpr={low ? 1 : [1, 1.6]}
      gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, CAMERA_Z], fov: FOV, near: 2, far: 60 }}
      style={{ touchAction: "pan-y", background: "transparent" }}
      aria-hidden
    >
      <Studio isDark={props.isDark} />
      <directionalLight position={[-5, 7, 12]} intensity={1.6} />
      <directionalLight position={[8, -4, 6]} intensity={0.5} color={ink.blue} />
      <Snake {...props} />
    </Canvas>
  );
}

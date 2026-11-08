import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FORMS, LINKS, LINK_CAPACITY, LINK_WIDTH, PARTS, makeFrame } from "./forms";
import type { StemSceneProps } from "./types";

const HOLD = 6.5;
const TRAVEL = 2.6;
const STEP = HOLD + TRAVEL;
const CYCLE = STEP * FORMS.length;
const STILL_TIME = 1.3;

const damp = THREE.MathUtils.damp;
const lerp = THREE.MathUtils.lerp;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);

function lowPowerDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
}

function Studio() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new THREE.Scene();
    room.background = new THREE.Color(0x2c50c8);
    const panel = (power: number, size: [number, number], pos: [number, number, number]) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(...size),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(0xffffff).multiplyScalar(power),
          side: THREE.DoubleSide,
        }),
      );
      mesh.position.set(...pos);
      mesh.lookAt(0, 0, 0);
      room.add(mesh);
    };
    panel(6, [12, 5], [0, 10, 6]);
    panel(2.5, [4, 12], [-10, 1, 6]);
    panel(1.5, [4, 12], [10, 0, 4]);
    const target = pmrem.fromScene(room, 0.03);
    scene.environment = target.texture;
    invalidate();
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      room.traverse((n) => {
        if (n instanceof THREE.Mesh) {
          n.geometry.dispose();
          n.material.dispose();
        }
      });
    };
  }, [gl, scene, invalidate]);
  return null;
}

function World({ still, onStage }: StemSceneProps) {
  const size = useThree((s) => s.size);
  const setDpr = useThree((s) => s.setDpr);
  const root = useRef<THREE.Group>(null);
  const boxes = useRef<THREE.InstancedMesh>(null);
  const balls = useRef<THREE.InstancedMesh>(null);
  const rods = useRef<THREE.InstancedMesh>(null);

  const low = useMemo(lowPowerDevice, []);
  const parts = useMemo(
    () => ({
      a: makeFrame(),
      b: makeFrame(),
      box: new RoundedBoxGeometry(1, 1, 1, low ? 1 : 2, 0.09),
      sphere: new THREE.SphereGeometry(0.5, low ? 12 : 20, low ? 10 : 14),
      rod: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
      material: new THREE.MeshStandardMaterial({
        roughness: 0.34,
        metalness: 0.08,
        color: 0xffffff,
      }),
      rodMaterial: new THREE.MeshStandardMaterial({
        roughness: 0.5,
        color: 0xffffff,
      }),
      dummy: new THREE.Object3D(),
      p: new THREE.Vector3(),
      q: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      col: new THREE.Color(),
    }),
    [low],
  );
  useEffect(
    () => () => {
      parts.box.dispose();
      parts.sphere.dispose();
      parts.rod.dispose();
      parts.material.dispose();
      parts.rodMaterial.dispose();
    },
    [parts],
  );

  const clock = useRef(still ? STILL_TIME : 0);
  const shown = useRef(-1);
  const perf = useRef({ sum: 0, frames: 0, dropped: false });
  const current = useMemo(() => new Float32Array(PARTS * 3), []);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    if (!still) clock.current += dt;
    const c = clock.current % CYCLE;
    const stage = Math.floor(c / STEP) % FORMS.length;
    const next = (stage + 1) % FORMS.length;
    const local = c - stage * STEP;
    const moving = !still && local > HOLD;
    const u = moving ? (local - HOLD) / TRAVEL : 0;

    if (!still && clock.current > 5 && !perf.current.dropped) {
      perf.current.sum += rawDelta;
      if (++perf.current.frames === 90) {
        if (perf.current.sum / 90 > 1 / 30) {
          perf.current.dropped = true;
          setDpr(1);
        }
        perf.current.frames = 0;
        perf.current.sum = 0;
      }
    }

    const visible = u > 0.5 ? next : stage;
    if (visible !== shown.current) {
      shown.current = visible;
      onStage(visible);
    }

    const { a, b, dummy, col } = parts;
    FORMS[stage](a, local);
    if (moving) FORMS[next](b, local - STEP);

    const bx = boxes.current!;
    const bl = balls.current!;
    for (let i = 0; i < PARTS; i++) {
      const delay = ((i * 37) % PARTS) / PARTS;
      const w = moving ? ease(clamp01(u * 1.45 - delay * 0.45)) : 0;
      const i3 = i * 3;
      const mix = (from: Float32Array, to: Float32Array, k: number) =>
        lerp(from[k], moving ? to[k] : from[k], w);
      let x = mix(a.pos, b.pos, i3);
      let y = mix(a.pos, b.pos, i3 + 1);
      let z = mix(a.pos, b.pos, i3 + 2);
      // Travelling parts swing out on an arc rather than sliding in a line.
      if (moving && w > 0 && w < 1) {
        const arc = Math.sin(Math.PI * w);
        const spin = arc * 0.9;
        const nx = x * Math.cos(spin) - z * Math.sin(spin);
        const nz = x * Math.sin(spin) + z * Math.cos(spin);
        x = nx * (1 + arc * 0.12);
        z = nz * (1 + arc * 0.12);
        y += Math.sin(i * 1.7) * arc * 0.5;
      }
      current[i3] = x;
      current[i3 + 1] = y;
      current[i3 + 2] = z;
      const round = lerp(a.round[i], moving ? b.round[i] : a.round[i], w);
      const shrink = moving ? 1 - Math.sin(Math.PI * w) * 0.25 : 1;
      const sx = mix(a.size, b.size, i3) * shrink;
      const sy = mix(a.size, b.size, i3 + 1) * shrink;
      const sz = mix(a.size, b.size, i3 + 2) * shrink;
      dummy.position.set(x, y, z);
      dummy.rotation.set(mix(a.rot, b.rot, i3), mix(a.rot, b.rot, i3 + 1), mix(a.rot, b.rot, i3 + 2));
      const boxAmount = Math.sqrt(1 - round);
      const ballAmount = Math.sqrt(round);
      dummy.scale.set(sx * boxAmount + 1e-4, sy * boxAmount + 1e-4, sz * boxAmount + 1e-4);
      dummy.updateMatrix();
      bx.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(sx * ballAmount + 1e-4, sy * ballAmount + 1e-4, sz * ballAmount + 1e-4);
      dummy.updateMatrix();
      bl.setMatrixAt(i, dummy.matrix);
      col.setRGB(mix(a.color, b.color, i3), mix(a.color, b.color, i3 + 1), mix(a.color, b.color, i3 + 2));
      bx.setColorAt(i, col);
      bl.setColorAt(i, col);
    }
    bx.instanceMatrix.needsUpdate = true;
    bl.instanceMatrix.needsUpdate = true;
    if (bx.instanceColor) bx.instanceColor.needsUpdate = true;
    if (bl.instanceColor) bl.instanceColor.needsUpdate = true;

    // Bonds let go first, then the new ones form once parts have arrived.
    const list = LINKS[u > 0.5 ? next : stage];
    const grow = moving ? (u < 0.5 ? clamp01(1 - u / 0.22) : clamp01((u - 0.78) / 0.22)) : 1;
    const rd = rods.current!;
    const thick = LINK_WIDTH[u > 0.5 ? next : stage] * ease(grow);
    for (let k = 0; k < LINK_CAPACITY; k++) {
      const link = list[k];
      if (!link || thick <= 0.0005) {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(1e-4);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        rd.setMatrixAt(k, dummy.matrix);
        continue;
      }
      const A = link[0] * 3;
      const B = link[1] * 3;
      parts.p.set(current[A], current[A + 1], current[A + 2]);
      parts.q.set(current[B], current[B + 1], current[B + 2]);
      const length = parts.p.distanceTo(parts.q);
      dummy.position.copy(parts.p).add(parts.q).multiplyScalar(0.5);
      parts.q.sub(parts.p).normalize();
      dummy.quaternion.setFromUnitVectors(parts.up, parts.q);
      dummy.scale.set(thick, length, thick);
      dummy.updateMatrix();
      rd.setMatrixAt(k, dummy.matrix);
    }
    rd.instanceMatrix.needsUpdate = true;

    const g = root.current!;
    if (still) g.rotation.set(0.05, 0, 0);
    else {
      const sway = Math.sin(clock.current * 0.11) * 0.1;
      g.rotation.y = damp(g.rotation.y, sway + state.pointer.x * 0.16, 2.6, dt);
      g.rotation.x = damp(g.rotation.x, 0.05 - state.pointer.y * 0.07, 2.6, dt);
    }
  });

  const aspect = size.width / Math.max(1, size.height);
  const fit = Math.min(1, aspect / 1.55);
  const shadows = !low;

  return (
    <>
      <group ref={root} scale={fit} position={[0, 0.42, 0]}>
        <instancedMesh
          ref={boxes}
          args={[parts.box, parts.material, PARTS]}
          castShadow={shadows}
          receiveShadow={shadows}
          frustumCulled={false}
        />
        <instancedMesh
          ref={balls}
          args={[parts.sphere, parts.material, PARTS]}
          castShadow={shadows}
          receiveShadow={shadows}
          frustumCulled={false}
        />
        <instancedMesh
          ref={rods}
          args={[parts.rod, parts.rodMaterial, LINK_CAPACITY]}
          castShadow={shadows}
          frustumCulled={false}
        />
      </group>
      {shadows ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.32 * fit + 0.42, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <shadowMaterial opacity={0.26} color={0x061540} />
        </mesh>
      ) : null}
    </>
  );
}

export default function StemCanvas(props: StemSceneProps) {
  const low = useMemo(lowPowerDevice, []);
  return (
    <Canvas
      frameloop={props.active && !props.still ? "always" : "demand"}
      dpr={low ? 1 : [1, 1.5]}
      shadows={low ? false : "soft"}
      flat
      gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.7, 11.6], fov: 30, near: 1, far: 60 }}
      style={{ touchAction: "pan-y", background: "transparent" }}
      aria-hidden
    >
      <Studio />
      <directionalLight
        position={[3.5, 9, 6]}
        intensity={1.25}
        castShadow={!low}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-radius={7}
        shadow-bias={-0.0006}
      />
      <World {...props} />
    </Canvas>
  );
}

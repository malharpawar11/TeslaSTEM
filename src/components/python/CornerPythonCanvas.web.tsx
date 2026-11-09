import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ink, palette } from "@/theme/tokens";
import { CORNER_ASPECT, type CornerPythonProps } from "./CornerPython.types";

/**
 * The python that lives behind the corner of the screen. Its body slides along
 * a fixed path that starts out of view, so it really comes out of the corner:
 * it lunges out, hisses once, and goes back in until the next page.
 */

const RINGS = 96;
const SIDES = 16;
const BODY_RADIUS = 0.56;
const HEAD_SCALE = 2.35;
// The view is wider than tall; this keeps its right edge on the screen corner.
const CAMERA_SHIFT = Math.tan((15 * Math.PI) / 180) * 13 * (CORNER_ASPECT - 1);
const PATH_SAMPLES = 256;
// Seconds into each appearance: one hiss, then it goes until the next page.
const HISS_AT = 0.75;
const LEAVE_AT = 2.7;
const smooth = THREE.MathUtils.smoothstep;

const WAYPOINTS: [number, number, number][] = [
  [5.6, -5.6, 0],
  [4.2, -4.1, 0],
  [2.75, -3.05, 0.2],
  [1.7, -1.95, 0.1],
  [2.1, -0.65, 0.2],
  [1.7, 0.6, 0.4],
  [0.6, 1.15, 0.7],
  [-0.6, 1.1, 0.9],
];

function skinTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  // The middle of the strip runs down the back; the seam is under the belly.
  const ground = ctx.createLinearGradient(0, 0, 0, 192);
  ground.addColorStop(0, "#DDE8C4");
  ground.addColorStop(0.18, palette.green[700]);
  ground.addColorStop(0.5, palette.green[500]);
  ground.addColorStop(0.82, palette.green[700]);
  ground.addColorStop(1, "#DDE8C4");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, 1024, 192);
  const saddles = 11;
  const blot = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let i = 0; i < saddles; i++) {
    const x = ((i + 0.5) / saddles) * 1024;
    ctx.fillStyle = "#050D26";
    blot(x, 96, 34, 44);
    blot(x + 46, 40, 11, 10);
    blot(x + 46, 152, 11, 10);
    ctx.fillStyle = ink.blue;
    blot(x, 96, 24, 32);
  }
  // A staggered grid of scales over everything.
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  for (let y = 0; y < 192; y += 8)
    for (let x = (y / 8) % 2 ? 0 : 7; x < 1024; x += 14) {
      ctx.moveTo(x + 4, y);
      ctx.ellipse(x, y, 4, 2.4, 0, 0, Math.PI * 2);
    }
  ctx.fill();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

function hissAt(clock: number) {
  const local = clock - HISS_AT;
  return smooth(local, 0, 0.2) * (1 - smooth(local, 1.2, 1.6));
}

function Snake({ present, still }: CornerPythonProps) {
  const { invalidate, setFrameloop } = useThree();
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const skull = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Group>(null);
  const tongue = useRef<THREE.Group>(null);
  // Spring state for how far along its path the head has travelled.
  const reach = useRef(still ? 1 : 0);
  const speed = useRef(0);
  const appearance = useRef(0);
  const time = useRef(1);
  const wasPresent = useRef(false);

  const { geometry, map, path } = useMemo(() => {
    const count = (RINGS + 1) * (SIDES + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    g.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    const uv = new Float32Array(count * 2);
    const index: number[] = [];
    for (let r = 0; r <= RINGS; r++)
      for (let s = 0; s <= SIDES; s++) {
        const i = r * (SIDES + 1) + s;
        uv[i * 2] = r / RINGS;
        uv[i * 2 + 1] = s / SIDES;
        if (r < RINGS && s < SIDES) {
          const a = i;
          const b = i + SIDES + 1;
          index.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(index);
    const curve = new THREE.CatmullRomCurve3(
      WAYPOINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      false,
      "centripetal",
    );
    return {
      geometry: g,
      map: skinTexture(),
      path: curve.getSpacedPoints(PATH_SAMPLES),
    };
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      map.dispose();
    },
    [geometry, map],
  );
  useEffect(() => {
    if (present && !still) setFrameloop("always");
    invalidate();
  }, [present, still, invalidate, setFrameloop]);

  // Reused every frame so the animation allocates nothing.
  const s = useMemo(
    () => ({
      spine: Array.from({ length: RINGS + 1 }, () => new THREE.Vector3()),
      tangent: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      binormal: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      depth: new THREE.Vector3(0, 0, 1),
      basis: new THREE.Matrix4(),
    }),
    [],
  );

  const along = (param: number, out: THREE.Vector3) => {
    // Beyond either end the path carries straight on.
    const last = PATH_SAMPLES;
    const scaled = param * last;
    const i = Math.min(last - 1, Math.max(0, Math.floor(scaled)));
    return out.lerpVectors(path[i], path[i + 1], scaled - i);
  };

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.04);
    if (!still) {
      time.current += step;
      appearance.current += step;
    }
    if (present && !wasPresent.current) appearance.current = 0;
    wasPresent.current = present;

    const t = time.current;
    const clock = appearance.current;
    const hiss = still || !present ? 0 : hissAt(clock);
    const target = present && (still || clock < LEAVE_AT) ? 1 : 0;

    if (still) {
      reach.current = target;
    } else {
      // A bouncy spring coming out; a stiff, quick one going back in.
      const out = target > reach.current;
      const k = out ? 120 : 170;
      const c = out ? 12.5 : 25;
      speed.current +=
        ((target - reach.current) * k - speed.current * c) * step;
      reach.current += speed.current * step;
    }
    const extended = reach.current + hiss * 0.05;
    const gone = reach.current <= 0.012 && Math.abs(speed.current) < 0.05;
    if (root.current) root.current.visible = reach.current > 0.012;
    // Nothing to draw until the next page, so stop using the GPU.
    if (gone && !still) {
      setFrameloop("demand");
      return;
    }

    const sway = still ? 0 : Math.sin(t * 1.15);
    const swayFast = still ? 0 : Math.sin(t * 2.3);
    for (let r = 0; r <= RINGS; r++) {
      const u = r / RINGS;
      const param = extended - 1 + u;
      along(param, s.spine[r]);
      if (param > 1)
        s.spine[r].add(
          s.tangent
            .subVectors(path[PATH_SAMPLES], path[PATH_SAMPLES - 1])
            .multiplyScalar((param - 1) * PATH_SAMPLES),
        );
      // Ripples run up the body and grow toward the head.
      const weight = smooth(param, 0.1, 0.95);
      s.spine[r].x +=
        Math.sin(u * 10 - t * 2.4) * 0.11 * weight +
        sway * 0.2 * weight * weight;
      s.spine[r].y +=
        Math.cos(u * 8 - t * 2) * 0.08 * weight + swayFast * 0.05 * weight;
      s.spine[r].z += Math.sin(u * 7 - t * 1.6) * 0.14 * weight;
    }

    const position = geometry.attributes.position as THREE.BufferAttribute;
    const normals = geometry.attributes.normal as THREE.BufferAttribute;
    s.normal.set(0, 0, 1);
    for (let r = 0; r <= RINGS; r++) {
      const u = r / RINGS;
      s.tangent
        .subVectors(
          s.spine[Math.min(RINGS, r + 1)],
          s.spine[Math.max(0, r - 1)],
        )
        .normalize();
      s.normal.addScaledVector(s.tangent, -s.normal.dot(s.tangent)).normalize();
      s.binormal.crossVectors(s.tangent, s.normal);
      const radius = BODY_RADIUS * (1 - 0.3 * smooth(u, 0.74, 1));
      for (let side = 0; side <= SIDES; side++) {
        const angle = (side / SIDES - 0.5) * Math.PI * 2;
        s.direction
          .copy(s.normal)
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(s.binormal, Math.sin(angle));
        const i = r * (SIDES + 1) + side;
        const p = s.spine[r];
        position.setXYZ(
          i,
          p.x + s.direction.x * radius,
          p.y + s.direction.y * radius,
          p.z + s.direction.z * radius,
        );
        normals.setXYZ(i, s.direction.x, s.direction.y, s.direction.z);
      }
    }
    position.needsUpdate = true;
    normals.needsUpdate = true;

    if (head.current) {
      head.current.position.copy(s.spine[RINGS]);
      s.tangent.subVectors(s.spine[RINGS], s.spine[RINGS - 4]).normalize();
      // In the plane of the screen, so the head stays upright as it turns.
      s.normal.crossVectors(s.tangent, s.depth).normalize();
      s.binormal.crossVectors(s.tangent, s.normal).normalize();
      head.current.quaternion.setFromRotationMatrix(
        s.basis.makeBasis(s.tangent, s.normal, s.binormal),
      );
    }
    const open = hiss * 0.5;
    if (skull.current) skull.current.rotation.z = open * 0.5;
    if (jaw.current) jaw.current.rotation.z = -open;
    if (tongue.current) {
      const idle = still
        ? 0
        : smooth(t % 2.7, 0, 0.12) * (1 - smooth(t % 2.7, 0.42, 0.56));
      const flick = Math.max(hiss, reach.current > 0.8 ? idle : 0);
      tongue.current.visible = flick >= 0.02;
      tongue.current.scale.x = Math.max(
        0.001,
        flick * (0.72 + 0.28 * Math.sin(t * 34)),
      );
      tongue.current.rotation.z = Math.sin(t * 27) * 0.16 * flick;
    }
  });

  return (
    <group ref={root}>
      <mesh geometry={geometry} frustumCulled={false}>
        <meshStandardMaterial map={map} roughness={0.34} metalness={0.06} />
      </mesh>
      <group ref={head} scale={HEAD_SCALE}>
        <group ref={skull}>
          <mesh position={[0.12, 0.06, 0]} scale={[0.36, 0.2, 0.28]}>
            <sphereGeometry args={[1, 24, 18]} />
            <meshStandardMaterial color={palette.green[600]} roughness={0.34} />
          </mesh>
          <mesh position={[0.4, 0.04, 0]} scale={[0.3, 0.13, 0.19]}>
            <sphereGeometry args={[1, 24, 18]} />
            <meshStandardMaterial color={palette.green[500]} roughness={0.34} />
          </mesh>
          <mesh position={[0.1, 0.21, 0]} scale={[0.27, 0.06, 0.12]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshStandardMaterial color="#07122F" roughness={0.4} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} position={[0.27, 0.13, side * 0.19]}>
              <mesh>
                <sphereGeometry args={[0.062, 16, 12]} />
                <meshStandardMaterial color={0x050505} roughness={0.05} />
              </mesh>
              <mesh position={[0.02, 0.03, side * 0.045]}>
                <sphereGeometry args={[0.016, 8, 6]} />
                <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
              </mesh>
            </group>
          ))}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[0.52, -0.09, side * 0.09]}
              rotation={[0, 0, Math.PI]}
            >
              <coneGeometry args={[0.022, 0.13, 10]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0.08, -0.05, 0]} scale={[0.16, 0.09, 0.15]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color="#4A1720" roughness={0.7} />
          </mesh>
          <mesh position={[0.36, -0.05, 0]} scale={[0.28, 0.03, 0.16]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color="#8E2F3C" roughness={0.6} />
          </mesh>
        </group>
        <group ref={jaw} position={[-0.04, -0.04, 0]}>
          <mesh position={[0.3, -0.05, 0]} scale={[0.37, 0.09, 0.21]}>
            <sphereGeometry args={[1, 20, 14]} />
            <meshStandardMaterial color={palette.green[600]} roughness={0.4} />
          </mesh>
          <mesh position={[0.28, 0.015, 0]} scale={[0.31, 0.035, 0.17]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color="#8E2F3C" roughness={0.6} />
          </mesh>
          <group ref={tongue} position={[0.5, 0.05, 0]}>
            <mesh position={[0.26, 0, 0]}>
              <boxGeometry args={[0.52, 0.026, 0.026]} />
              <meshBasicMaterial color={ink.blue} toneMapped={false} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={[0.58, side * 0.03, 0]}
                rotation={[0, 0, side * 0.55]}
              >
                <boxGeometry args={[0.15, 0.022, 0.022]} />
                <meshBasicMaterial color={ink.blue} toneMapped={false} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}

export default function CornerPythonCanvas(props: CornerPythonProps) {
  return (
    <Canvas
      frameloop={props.still ? "demand" : "always"}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{
        position: [-CAMERA_SHIFT, 0, 13],
        rotation: [0, 0, 0],
        fov: 30,
        near: 1,
        far: 40,
      }}
      style={{ background: "transparent", pointerEvents: "none" }}
    >
      <ambientLight intensity={1.0} />
      <directionalLight position={[-4, 6, 9]} intensity={2.3} />
      <directionalLight
        position={[6, -2, 5]}
        intensity={0.6}
        color={ink.blue}
      />
      <Snake {...props} />
    </Canvas>
  );
}

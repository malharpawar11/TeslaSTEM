import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { palette } from "@/theme/tokens";
import { FLOORS, type Floor, type Rect } from "./plan";
import type { CampusMapSceneProps } from "./types";

/**
 * A miniature of one floor at a time: classrooms stand as separate blocks on a
 * white slab either side of the corridor. Rooms where clubs meet are blue and
 * carry a count when more than one club uses them. The chosen room lifts and
 * turns solid blue. Nothing moves on its own after the rooms rise in.
 */

const UNIT = 1 / 100;
const CENTER_X = 737;
const CENTER_Z = 205;
const GAP = 5;
const ELEVATION = 0.96;
const FOV = 20;
const REST_YAW = -0.16;
// Taller than wide (phones): the corridor runs down the screen instead.
const PORTRAIT_YAW = -Math.PI / 2 + 0.1;
const MAX_TURN = 0.3;
// Where a floor waits while the other one is shown: the first floor sinks,
// the second floor rises.
const AWAY = { 1: -1.4, 2: 1.8 } as const;

const H = {
  slab: 0.12,
  service: 0.1,
  room: 0.26,
  club: 0.34,
  hover: 0.07,
  lift: 0.24,
};

type Tone = [fill: string, edge: string, label: string];

interface Ink {
  slab: string;
  slabEdge: string;
  hall: string;
  service: string;
  serviceEdge: string;
  stairs: string;
  void: string;
  room: Tone;
  club: Tone;
  mine: Tone;
  chosen: Tone;
  badge: string;
  badgeText: string;
}

const LIGHT: Ink = {
  slab: "#FFFFFF",
  slabEdge: "#C4C8CE",
  hall: "#EEF0F3",
  service: "#E4E6EA",
  serviceEdge: "#CDD1D6",
  stairs: "#9AA0A8",
  void: "#F6F7F8",
  room: ["#FFFFFF", "#B9BEC6", "#7D838C"],
  club: [palette.blue[100], palette.blue[400], palette.blue[700]],
  mine: [palette.green[100], palette.green[400], palette.green[700]],
  chosen: [palette.blue[500], palette.blue[600], "#FFFFFF"],
  badge: palette.blue[500],
  badgeText: "#FFFFFF",
};

const DARK: Ink = {
  slab: "#0B0B0B",
  slabEdge: "#3A3A3A",
  hall: "#171717",
  service: "#1C1C1C",
  serviceEdge: "#333333",
  stairs: "#4A4A4A",
  void: "#050505",
  room: ["#121212", "#4A4A4A", "#8C8C8C"],
  club: ["#0E1D45", palette.blue[400], palette.blue[200]],
  mine: ["#11280A", palette.green[400], palette.green[200]],
  chosen: [palette.blue[500], palette.blue[300], "#FFFFFF"],
  badge: palette.blue[400],
  badgeText: "#000000",
};

function place([left, top, right, bottom]: Rect, inset = 0) {
  return {
    x: ((left + right) / 2 - CENTER_X) * UNIT,
    z: ((top + bottom) / 2 - CENTER_Z) * UNIT,
    w: (right - left - inset * 2) * UNIT,
    d: (bottom - top - inset * 2) * UNIT,
  };
}

const BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const EDGES = new THREE.EdgesGeometry(BOX);
const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const noRaycast = () => null;

/** Every material on a floor, so the floor can fade in and out as one. */
class FloorPaint {
  private all: { material: THREE.Material; base: number }[] = [];
  private amount = 1;
  track<M extends THREE.Material>(material: M, base = 1) {
    material.transparent = true;
    this.all.push({ material, base });
    this.apply(material, base);
    return material;
  }
  fill(color: string) {
    return this.track(new THREE.MeshStandardMaterial({ color, roughness: 0.92 }));
  }
  line(color: string, base = 1) {
    return this.track(new THREE.LineBasicMaterial({ color }), base);
  }
  private apply(material: THREE.Material, base: number) {
    material.opacity = base * this.amount;
    material.visible = this.amount > 0.01;
  }
  fade(amount: number) {
    this.amount = amount;
    for (const { material, base } of this.all) this.apply(material, base);
  }
  dispose() {
    for (const { material } of this.all) material.dispose();
  }
}

function useFontReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) return setReady(true);
    fonts
      .load("800 96px BigShoulders")
      .catch(() => undefined)
      .then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

function texture(canvas: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

/** White room number on clear; the material's colour tints it. */
function labelTexture(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 100px BigShoulders, sans-serif";
  ctx.fillText(text, 128, 70, 236);
  return texture(canvas);
}

/** The club count that floats over a room: a filled circle with a number. */
function badgeTexture(count: number, fill: string, ink: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 80px BigShoulders, sans-serif";
  ctx.fillText(String(count), 64, 70);
  return texture(canvas);
}

/** Eases a value toward its target and keeps frames coming until it lands. */
function useEase(still: boolean) {
  const { invalidate } = useThree();
  return (value: number, target: number, delta: number, rate = 10) => {
    if (still) return target;
    const next = THREE.MathUtils.damp(value, target, rate, Math.min(delta, 0.05));
    if (Math.abs(next - target) < 1e-4) return target;
    invalidate();
    return next;
  };
}

function Block({
  rect,
  height,
  y = 0,
  fill,
  edge,
  inset = 0,
  shadow = false,
}: {
  rect: Rect;
  height: number;
  y?: number;
  fill: THREE.Material;
  edge?: THREE.Material;
  inset?: number;
  shadow?: boolean;
}) {
  const { x, z, w, d } = place(rect, inset);
  return (
    <group position={[x, y, z]} scale={[w, height, d]}>
      <mesh
        geometry={BOX}
        material={fill}
        raycast={noRaycast}
        castShadow={shadow}
        receiveShadow
      />
      {edge ? (
        <lineSegments geometry={EDGES} material={edge} raycast={noRaycast} />
      ) : null}
    </group>
  );
}

function Room({
  room,
  rect,
  count,
  mine,
  chosen,
  hovered,
  paint,
  ink,
  label,
  active,
  still,
  delay,
  onSelect,
  onHover,
  dragged,
  portrait,
}: {
  portrait: boolean;
  room: string;
  rect: Rect;
  count: number;
  mine: boolean;
  chosen: boolean;
  hovered: boolean;
  paint: FloorPaint;
  ink: Ink;
  label: THREE.Texture | null;
  active: boolean;
  still: boolean;
  delay: number;
  onSelect: (room: string) => void;
  onHover: (room: string | null, mesh?: THREE.Object3D) => void;
  dragged: { current: boolean };
}) {
  const body = useRef<THREE.Group>(null);
  const top = useRef<THREE.Group>(null);
  const badge = useRef<THREE.Sprite>(null);
  const ease = useEase(still);
  const { invalidate } = useThree();
  const { x, z, w, d } = place(rect, GAP);

  const tone = chosen ? ink.chosen : mine && count ? ink.mine : count ? ink.club : ink.room;
  // Made once per floor paint; their colours ease toward `tone` every frame.
  const materials = useMemo(
    () => ({
      fill: paint.fill(tone[0]) as THREE.MeshStandardMaterial,
      edge: paint.line(tone[1]) as THREE.LineBasicMaterial,
      text: label
        ? paint.track(
            new THREE.MeshBasicMaterial({
              map: label,
              color: tone[2],
              depthWrite: false,
              toneMapped: false,
            }),
          )
        : null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paint, label],
  );
  const target = useMemo(() => tone.map((c) => new THREE.Color(c)), [tone]);

  const badgeMap = useMemo(
    () => (count > 1 ? badgeTexture(count, ink.badge, ink.badgeText) : null),
    [count, ink],
  );
  const badgeMaterial = useMemo(
    () =>
      badgeMap
        ? paint.track(
            new THREE.SpriteMaterial({ map: badgeMap, depthWrite: false, toneMapped: false }),
          )
        : null,
    [badgeMap, paint],
  );
  useEffect(() => () => badgeMap?.dispose(), [badgeMap]);

  const rest = count ? H.club : H.room;
  const state = useRef({ height: still ? rest : 0, lift: 0, born: -1 }).current;

  useFrame(({ clock }, delta) => {
    if (state.born < 0) state.born = clock.elapsedTime;
    const due = still || clock.elapsedTime - state.born > delay;
    if (due) state.height = ease(state.height, rest, delta, 9);
    else invalidate();
    state.lift = ease(state.lift, chosen ? H.lift : hovered ? H.hover : 0, delta, 12);

    const mix = still ? 1 : 1 - Math.exp(-14 * Math.min(delta, 0.05));
    const tints: [THREE.Color, THREE.Color][] = [
      [materials.fill.color, target[0]],
      [materials.edge.color, target[1]],
    ];
    if (materials.text) tints.push([materials.text.color, target[2]]);
    for (const [color, goal] of tints) {
      if (color.equals(goal)) continue;
      color.lerp(goal, mix);
      const off =
        Math.abs(color.r - goal.r) + Math.abs(color.g - goal.g) + Math.abs(color.b - goal.b);
      if (off < 0.003) color.copy(goal);
      else invalidate();
    }

    const h = Math.max(0.001, state.height);
    if (body.current) {
      body.current.scale.y = h;
      body.current.position.y = state.lift;
    }
    if (top.current) top.current.position.y = state.lift + h + 0.004;
    if (badge.current) {
      badge.current.position.y = state.lift + h + 0.2;
      const s = Math.min(1, h / H.club) * 0.32;
      badge.current.scale.set(s, s, 1);
    }
  });

  const labelHeight = portrait
    ? Math.min(w * 0.5, d * 0.48, 0.44)
    : Math.min(d * 0.5, w * 0.48, 0.44);
  const handlers = active
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (!dragged.current) onSelect(room);
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(room, body.current ?? undefined);
        },
        onPointerOut: () => onHover(null),
      }
    : {};

  return (
    <group position={[x, 0, z]}>
      <group ref={body} scale={[w, 0.001, d]}>
        <mesh
          geometry={BOX}
          material={materials.fill}
          castShadow
          receiveShadow
          raycast={active ? undefined : noRaycast}
          {...handlers}
        />
        <lineSegments geometry={EDGES} material={materials.edge} raycast={noRaycast} />
      </group>
      {materials.text ? (
        <group ref={top} rotation={[0, portrait ? Math.PI / 2 : 0, 0]}>
          <mesh
            geometry={PLANE}
            material={materials.text}
            scale={[labelHeight * 2, 1, labelHeight]}
            raycast={noRaycast}
          />
        </group>
      ) : null}
      {badgeMaterial ? (
        <sprite
          ref={badge}
          material={badgeMaterial}
          position={[w / 2 - 0.08, 0, -d / 2 + 0.08]}
          scale={[0.001, 0.001, 1]}
          raycast={noRaycast}
        />
      ) : null}
    </group>
  );
}

function FloorModel({
  floor,
  props,
  ink,
  labels,
  hovered,
  onHover,
  dragged,
  portrait,
}: {
  portrait: boolean;
  floor: Floor;
  props: CampusMapSceneProps;
  ink: Ink;
  labels: Map<string, THREE.Texture> | null;
  hovered: string | null;
  onHover: (room: string | null, mesh?: THREE.Object3D) => void;
  dragged: { current: boolean };
}) {
  const group = useRef<THREE.Group>(null);
  const active = props.floor === floor.level;
  const ease = useEase(props.still);
  const paint = useMemo(() => new FloorPaint(), [ink]);
  useEffect(() => () => paint.dispose(), [paint]);
  const base = useMemo(
    () => ({
      slab: paint.fill(ink.slab),
      slabEdge: paint.line(ink.slabEdge),
      hall: paint.fill(ink.hall),
      service: paint.fill(ink.service),
      serviceEdge: paint.line(ink.serviceEdge),
      stairs: paint.fill(ink.stairs),
      void: paint.fill(ink.void),
    }),
    [paint, ink],
  );
  const motion = useRef({ y: active ? 0 : AWAY[floor.level], fade: active ? 1 : 0 }).current;
  const lastFade = useRef(-1);

  useFrame((_, delta) => {
    motion.y = ease(motion.y, active ? 0 : AWAY[floor.level], delta, 7);
    motion.fade = ease(motion.fade, active ? 1 : 0, delta, 8);
    if (group.current) {
      group.current.position.y = motion.y;
      group.current.visible = motion.fade > 0.01;
    }
    if (Math.abs(lastFade.current - motion.fade) > 1e-4) {
      paint.fade(motion.fade);
      lastFade.current = motion.fade;
    }
  });

  // Rooms rise left to right when the map first appears.
  const delays = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [room, rect] of Object.entries(floor.rooms))
      out[room] = 0.15 + ((rect[0] + rect[2]) / 2 / 1450) * 0.55;
    return out;
  }, [floor]);

  return (
    <group ref={group}>
      {floor.slab.map((rect, i) => (
        <Block
          key={`s${i}`}
          rect={rect}
          y={-H.slab}
          height={H.slab}
          fill={base.slab}
          edge={base.slabEdge}
        />
      ))}
      {floor.halls.map((rect, i) => (
        <Block key={`h${i}`} rect={rect} height={0.006} fill={base.hall} />
      ))}
      {floor.voids.map((rect, i) => (
        <Block
          key={`v${i}`}
          rect={rect}
          height={0.008}
          fill={base.void}
          edge={base.serviceEdge}
          inset={GAP}
        />
      ))}
      {floor.service.map((rect, i) => (
        <Block
          key={`x${i}`}
          rect={rect}
          height={H.service}
          fill={base.service}
          edge={base.serviceEdge}
          inset={GAP}
          shadow
        />
      ))}
      {floor.stairs.map((rect, i) => (
        <Block
          key={`t${i}`}
          rect={rect}
          height={H.service + 0.02}
          fill={base.stairs}
          inset={GAP / 2}
          shadow
        />
      ))}
      {Object.entries(floor.rooms).map(([room, rect]) => (
        <Room
          key={room}
          room={room}
          rect={rect}
          count={props.counts[room] ?? 0}
          mine={props.mine.has(room)}
          chosen={props.selected === room}
          hovered={active && hovered === room}
          paint={paint}
          ink={ink}
          label={labels?.get(room) ?? null}
          active={active}
          still={props.still}
          delay={delays[room]}
          onSelect={props.onSelect}
          onHover={onHover}
          dragged={dragged}
          portrait={portrait}
        />
      ))}
    </group>
  );
}

function Building(props: CampusMapSceneProps) {
  const { camera, size, gl, invalidate } = useThree();
  const ink = props.isDark ? DARK : LIGHT;
  const fontReady = useFontReady();
  const turn = useRef<THREE.Group>(null);
  const ease = useEase(props.still);
  const [hovered, setHovered] = useState<string | null>(null);
  const { onHover } = props;

  const labels = useMemo(() => {
    if (!fontReady) return null;
    const map = new Map<string, THREE.Texture>();
    for (const floor of FLOORS)
      for (const room of Object.keys(floor.rooms)) map.set(room, labelTexture(room));
    return map;
  }, [fontReady]);
  useEffect(() => () => labels?.forEach((t) => t.dispose()), [labels]);

  const portrait = size.width / Math.max(1, size.height) < 0.9;
  const rest = portrait ? PORTRAIT_YAW : REST_YAW;
  const yaw = useRef({ now: rest, target: rest, rest }).current;
  if (yaw.rest !== rest) {
    yaw.rest = rest;
    yaw.now = yaw.target = rest;
  }

  // Drag sideways to turn the model a little. A drag never counts as a click.
  const dragged = useRef(false);
  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "pan-y";
    let start: { x: number; yaw: number } | null = null;
    const down = (e: PointerEvent) => {
      start = { x: e.clientX, yaw: yaw.target };
      dragged.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      if (Math.abs(dx) > 4 && !dragged.current) {
        dragged.current = true;
        onHover?.(null);
      }
      yaw.target = THREE.MathUtils.clamp(
        start.yaw + dx * 0.004,
        yaw.rest - MAX_TURN,
        yaw.rest + MAX_TURN,
      );
      invalidate();
    };
    const up = () => {
      start = null;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl, invalidate, yaw, onHover]);

  useEffect(() => {
    gl.domElement.style.cursor = hovered ? "pointer" : "grab";
  }, [gl, hovered]);

  // Fit the floor to the view: whichever of width or depth runs out first.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const vHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const [long, short] = portrait ? [3.9, 14.4] : [14.4, 3.9];
    const turn = portrait ? PORTRAIT_YAW + Math.PI / 2 : REST_YAW;
    const width = long * Math.cos(turn) + short * Math.abs(Math.sin(turn));
    const across = (width / 2 + (portrait ? 0.4 : 0)) / (vHalf * aspect);
    const deep = ((short / 2) * Math.sin(ELEVATION) + 0.5) / vHalf;
    cam.userData.distance = Math.max(across, deep) * 1.08;
    cam.fov = FOV;
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate, portrait]);

  useEffect(() => invalidate(), [props, hovered, labels, invalidate]);

  // Tell the page where the hovered room sits, for its preview.
  const point = useMemo(() => new THREE.Vector3(), []);
  const reportHover = (room: string | null, mesh?: THREE.Object3D) => {
    setHovered(room);
    if (!onHover) return;
    if (!room || !mesh || dragged.current) return onHover(null);
    mesh.updateWorldMatrix(true, false);
    point.set(0, 1, 0).applyMatrix4(mesh.matrixWorld).project(camera);
    onHover({
      room,
      x: ((point.x + 1) / 2) * size.width,
      y: ((1 - point.y) / 2) * size.height,
    });
  };

  useFrame((_, delta) => {
    yaw.now = ease(yaw.now, yaw.target, delta, 8);
    if (turn.current) turn.current.rotation.y = yaw.now;
    const distance = (camera.userData.distance as number) ?? 20;
    camera.position.set(0, distance * Math.sin(ELEVATION), distance * Math.cos(ELEVATION));
    camera.lookAt(0, 0.1, 0.1);
  });

  return (
    <group ref={turn}>
      {/* Clicking the floor around the rooms clears the selection. */}
      <mesh
        position={[0, -0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={() => {
          if (!dragged.current) props.onSelect(null);
        }}
      >
        <planeGeometry args={[40, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {FLOORS.map((floor) => (
        <FloorModel
          key={floor.level}
          floor={floor}
          props={props}
          ink={ink}
          labels={labels}
          hovered={hovered}
          onHover={reportHover}
          dragged={dragged}
          portrait={portrait}
        />
      ))}
    </group>
  );
}

export default function MapCanvas(props: CampusMapSceneProps) {
  return (
    <Canvas
      frameloop="demand"
      shadows="soft"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ fov: FOV, near: 1, far: 160, position: [0, 30, 18] }}
      style={{ background: "transparent" }}
    >
      <hemisphereLight
        args={[
          "#FFFFFF",
          props.isDark ? "#202020" : "#D9DDE3",
          props.isDark ? 1.2 : 1.55,
        ]}
      />
      <directionalLight
        position={[-5, 11, 6]}
        intensity={props.isDark ? 1.1 : 1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
      <Building {...props} />
    </Canvas>
  );
}

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontUrl from 'three/examples/fonts/helvetiker_bold.typeface.json?url';

interface Line { text: string; size: number; y: number; color: string; emissive: string; back?: boolean }

const LINES: Line[] = [
  { text: 'KINETIC', size: 1.05, y: 0.62, color: '#F1F5F9', emissive: '#000000' },
  { text: 'BAY', size: 1.05, y: -0.78, color: '#F08A4B', emissive: '#5a2a10' },
  { text: 'BUILDING MACHINES.', size: 0.44, y: 0.34, color: '#F1F5F9', emissive: '#000000', back: true },
  { text: 'SHAPING HUMANS.', size: 0.44, y: -0.42, color: '#F08A4B', emissive: '#5a2a10', back: true },
];

interface Letter {
  mesh: THREE.Mesh;
  rest: THREE.Vector3;
  back: boolean;
  off: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Vector3;
  rotVel: THREE.Vector3;
  seed: number;
}

export interface TypeState { progress: number; burst: number; hover: boolean }

function buildLetters(font: Font) {
  const letters: Letter[] = [];
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const resolution = (font.data as { resolution: number }).resolution;
  const glyphs = (font.data as { glyphs: Record<string, { ha: number }> }).glyphs;

  for (const line of LINES) {
    const key = line.color;
    if (!materials.has(key)) {
      materials.set(key, new THREE.MeshStandardMaterial({
        color: line.color, emissive: line.emissive, emissiveIntensity: 0.6, roughness: 0.32, metalness: 0.25,
      }));
    }
    const mat = materials.get(key)!;
    const tracking = line.size * 0.06;
    const advances = [...line.text].map((ch) => ((glyphs[ch]?.ha ?? 500) / resolution) * line.size + tracking);
    const width = advances.reduce((a, b) => a + b, 0) - tracking;
    let x = -width / 2;

    [...line.text].forEach((ch, i) => {
      const adv = advances[i];
      if (ch !== ' ') {
        const geo = new TextGeometry(ch, {
          font, size: line.size, depth: line.size * 0.34, curveSegments: 6,
          bevelEnabled: true, bevelThickness: line.size * 0.04, bevelSize: line.size * 0.025, bevelSegments: 3,
        });
        geo.computeBoundingBox();
        const bb = geo.boundingBox!;
        const cx = (bb.max.x + bb.min.x) / 2, cy = (bb.max.y + bb.min.y) / 2, cz = (bb.max.z + bb.min.z) / 2;
        geo.translate(-cx, -cy, -cz);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        // back-face lines are pre-flipped so they read upright once the block turns over
        const rest = line.back
          ? new THREE.Vector3(x + cx, -(line.y + cy - line.size * 0.35), -0.3)
          : new THREE.Vector3(x + cx, line.y + cy - line.size * 0.35, 0.3);
        if (line.back) mesh.rotation.x = Math.PI;
        letters.push({
          mesh, rest, back: !!line.back,
          off: new THREE.Vector3(), vel: new THREE.Vector3(),
          rot: new THREE.Vector3(), rotVel: new THREE.Vector3(),
          seed: Math.random() * 100,
        });
      }
      x += adv;
    });
  }
  return { letters, materials };
}

function Letters({ font, state, reduced }: { font: Font; state: MutableRefObject<TypeState>; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { viewport, camera, pointer } = useThree();
  const { letters, materials } = useMemo(() => buildLetters(font), [font]);
  const lastBurst = useRef(0);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const local = useMemo(() => new THREE.Vector3(), []);
  const inverse = useMemo(() => new THREE.Matrix4(), []);
  const hovering = useRef(false);

  useEffect(() => () => {
    letters.forEach((l) => l.mesh.geometry.dispose());
    materials.forEach((m) => m.dispose());
  }, [letters, materials]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;

    // scroll turns the block over to reveal the tagline behind it
    const p = state.current.progress;
    const flip = THREE.MathUtils.smoothstep(p, 0.28, 0.72) * Math.PI;
    g.rotation.x += (flip - g.rotation.x) * 0.12;
    g.rotation.y = reduced ? 0 : Math.sin(t * 0.35) * 0.12 + (state.current.hover ? pointer.x * 0.18 : 0);
    const fit = Math.min(1, (viewport.width * 0.88) / 6.4);
    g.scale.setScalar(fit);

    // click / tap burst
    if (state.current.burst !== lastBurst.current) {
      lastBurst.current = state.current.burst;
      letters.forEach((l) => {
        l.vel.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.3) * 0.9, Math.random() * 0.9 + 0.3);
        l.rotVel.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4);
      });
    }

    // cursor position in the block's local space
    ray.setFromCamera(pointer, camera);
    const hasHit = ray.ray.intersectPlane(plane, hit) !== null;
    if (hasHit) local.copy(hit).applyMatrix4(inverse.copy(g.matrixWorld).invert());
    hovering.current = hasHit && state.current.hover;

    const facingFront = g.rotation.x < Math.PI / 2;
    letters.forEach((l) => {
      const target = new THREE.Vector3();
      const targetRot = new THREE.Vector3();
      if (!reduced && hovering.current && l.back !== facingFront) {
        const dx = l.rest.x - local.x, dy = l.rest.y - local.y;
        const dist = Math.hypot(dx, dy);
        const R = 1.25;
        if (dist < R) {
          const f = (1 - dist / R) ** 2;
          target.set((dx / (dist + 1e-4)) * f * 0.9, (dy / (dist + 1e-4)) * f * 0.9, (l.back ? -1 : 1) * f * 1.4);
          targetRot.set(Math.sin(l.seed) * f * 1.4, Math.cos(l.seed * 1.3) * f * 1.6, Math.sin(l.seed * 0.7) * f * 0.9);
        }
      }
      // springs pull each letter home
      l.vel.addScaledVector(target.sub(l.off), 0.09).multiplyScalar(0.86);
      l.off.add(l.vel);
      l.rotVel.addScaledVector(targetRot.sub(l.rot), 0.08).multiplyScalar(0.85);
      l.rot.add(l.rotVel);

      const bob = reduced ? 0 : Math.sin(t * 1.4 + l.seed) * 0.025;
      l.mesh.position.set(l.rest.x + l.off.x, l.rest.y + l.off.y + bob, l.rest.z + l.off.z);
      l.mesh.rotation.set((l.back ? Math.PI : 0) + l.rot.x, l.rot.y, l.rot.z);
      // only the face turned toward the viewer is drawn; the swap happens edge-on
      l.mesh.visible = l.back !== facingFront;
    });
  });

  return (
    <group ref={group}>
      {letters.map((l, i) => <primitive key={i} object={l.mesh} />)}
    </group>
  );
}

function Scene({ state, reduced }: { state: MutableRefObject<TypeState>; reduced: boolean }) {
  const [font, setFont] = useState<Font | null>(null);
  useEffect(() => {
    let alive = true;
    new FontLoader().loadAsync(fontUrl).then((f) => { if (alive) setFont(f); });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[3, 7, 6]} intensity={2.4} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-5, -1, 4]} intensity={40} color="#F08A4B" />
      <pointLight position={[5, 2, -4]} intensity={30} color="#F6C36B" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.25, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.55} />
      </mesh>
      {font && <Letters font={font} state={state} reduced={reduced} />}
    </>
  );
}

export default function KineticType3D({ state, active, reduced }: {
  state: MutableRefObject<TypeState>; active: boolean; reduced: boolean;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.1, 9], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      frameloop={active ? 'always' : 'never'}
      onCreated={({ camera }) => camera.lookAt(0, -0.1, 0)}
      aria-hidden="true"
    >
      <Scene state={state} reduced={reduced} />
    </Canvas>
  );
}

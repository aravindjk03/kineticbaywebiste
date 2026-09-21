import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface MascotMood { hover: boolean; thinking: boolean }

const CREAM = '#F7F1EA';
const APRICOT = '#F08A4B';
const HONEY = '#F6C36B';

/**
 * KAI — Kinetic Bay's service guide. A friendly cream robot with a glass visor,
 * glowing apricot eyes and a smile. Eyes follow the cursor and blink; every few
 * seconds KAI hops and waves to say hello; the antenna pulses while "thinking".
 */
function Kai({ mood }: { mood: React.MutableRefObject<MascotMood> }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const smile = useRef<THREE.Mesh>(null);
  const arm = useRef<THREE.Group>(null);
  const beaconMat = useRef<THREE.MeshStandardMaterial>(null);
  const chestMat = useRef<THREE.MeshStandardMaterial>(null);
  const cursor = useRef(new THREE.Vector2());
  const blink = useRef({ next: 2, t: 0 });

  useEffect(() => {
    const f = (e: PointerEvent) => cursor.current.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    addEventListener('pointermove', f);
    return () => removeEventListener('pointermove', f);
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const m = mood.current;
    // a friendly hop + wave every 7 seconds (and constantly while hovered)
    const cycle = t % 7;
    const greet = m.hover ? 1 : cycle < 1.4 ? Math.sin((cycle / 1.4) * Math.PI) : 0;

    if (root.current) {
      root.current.position.y = -0.18 + Math.sin(t * 2) * 0.04 + Math.abs(Math.sin(t * 7)) * 0.12 * greet;
      root.current.rotation.z = Math.sin(t * 1.3) * 0.04;
    }
    if (head.current) {
      const tx = cursor.current.x * 0.5 - 0.15, ty = cursor.current.y * 0.3 + 0.1;
      head.current.rotation.y += (tx - head.current.rotation.y) * 0.08;
      head.current.rotation.x += (-ty - head.current.rotation.x) * 0.08;
      head.current.rotation.z = Math.sin(t * 8) * 0.1 * greet;
    }
    if (arm.current) arm.current.rotation.z = -0.4 - greet * (1.6 + Math.sin(t * 14) * 0.45);
    if (eyes.current) {
      const b = blink.current;
      b.t += dt;
      let sy = 1 - greet * 0.35; // happy squint while greeting
      if (b.t > b.next) {
        const k = (b.t - b.next) / 0.14;
        sy *= k < 1 ? Math.abs(1 - 2 * k) + 0.08 : 1;
        if (k >= 1) { b.t = 0; b.next = 1.8 + Math.random() * 3; }
      }
      eyes.current.scale.y = sy;
    }
    if (smile.current) smile.current.scale.setScalar(1 + greet * 0.25);
    const speed = m.thinking ? 12 : 3;
    if (beaconMat.current) beaconMat.current.emissiveIntensity = 1.4 + Math.sin(t * speed) * 0.9;
    if (chestMat.current) chestMat.current.emissiveIntensity = 1 + Math.sin(t * speed * 0.7) * 0.6;
  });

  return (
    <group ref={root}>
      {/* body */}
      <mesh position={[0, -0.95, 0]} scale={[1, 0.8, 0.85]}>
        <sphereGeometry args={[0.48, 40, 40]} />
        <meshStandardMaterial color={CREAM} roughness={0.28} metalness={0.05} />
      </mesh>
      <mesh position={[0, -0.9, 0.39]}>
        <circleGeometry args={[0.1, 32]} />
        <meshStandardMaterial ref={chestMat} color={HONEY} emissive={APRICOT} emissiveIntensity={1} />
      </mesh>
      {/* arms — the right one waves */}
      <mesh position={[-0.47, -0.95, 0]} rotation={[0, 0, 0.5]}>
        <capsuleGeometry args={[0.08, 0.22, 6, 12]} />
        <meshStandardMaterial color={APRICOT} roughness={0.35} />
      </mesh>
      <group ref={arm} position={[0.42, -0.8, 0]}>
        <mesh position={[0.12, -0.14, 0]}>
          <capsuleGeometry args={[0.08, 0.22, 6, 12]} />
          <meshStandardMaterial color={APRICOT} roughness={0.35} />
        </mesh>
      </group>

      <group ref={head} position={[0, 0.1, 0]}>
        {/* shell */}
        <mesh scale={[1, 0.86, 0.9]}>
          <sphereGeometry args={[0.72, 48, 48]} />
          <meshStandardMaterial color={CREAM} roughness={0.22} metalness={0.05} />
        </mesh>
        {/* visor */}
        <mesh position={[0, 0.02, 0.4]} scale={[0.86, 0.56, 0.44]}>
          <sphereGeometry args={[0.62, 40, 40]} />
          <meshStandardMaterial color="#1c1d22" roughness={0.12} metalness={0.4} />
        </mesh>
        {/* eyes */}
        <group ref={eyes} position={[0, 0.08, 0.66]}>
          {[-0.19, 0.19].map((x) => (
            <mesh key={x} position={[x, 0, 0]} scale={[1, 1.25, 1]}>
              <sphereGeometry args={[0.085, 24, 24]} />
              <meshStandardMaterial color="#FFE2C4" emissive={APRICOT} emissiveIntensity={2.2} />
            </mesh>
          ))}
        </group>
        {/* smile */}
        <mesh ref={smile} position={[0, -0.1, 0.66]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.1, 0.018, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#FFE2C4" emissive={APRICOT} emissiveIntensity={1.8} />
        </mesh>
        {/* cheeks */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.47, -0.14, 0.5]} rotation={[0, s * 0.7, 0]}>
            <circleGeometry args={[0.07, 24]} />
            <meshStandardMaterial color="#F7A98A" transparent opacity={0.85} />
          </mesh>
        ))}
        {/* ears */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.71, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, 0.1, 24]} />
            <meshStandardMaterial color={APRICOT} roughness={0.35} />
          </mesh>
        ))}
        {/* antenna */}
        <mesh position={[0, 0.76, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.26, 8]} />
          <meshStandardMaterial color="#c9c2ba" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.94, 0]}>
          <sphereGeometry args={[0.08, 20, 20]} />
          <meshStandardMaterial ref={beaconMat} color={HONEY} emissive={APRICOT} emissiveIntensity={1.6} />
        </mesh>
      </group>
    </group>
  );
}

export default function ChatMascot({ mood, className = '', zoom = 1 }: { mood: React.MutableRefObject<MascotMood>; className?: string; zoom?: number }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas camera={{ position: [0, -0.15, 4.4 / zoom], fov: 38 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={1.1} />
        <hemisphereLight args={['#fff6ec', '#3a2a20', 0.9]} />
        <directionalLight position={[2, 3, 4]} intensity={2} />
        <pointLight position={[-2, -1, 2]} intensity={5} color={APRICOT} />
        <Kai mood={mood} />
      </Canvas>
    </div>
  );
}

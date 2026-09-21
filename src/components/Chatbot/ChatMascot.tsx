import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface MascotMood { hover: boolean; thinking: boolean }

/**
 * KAI — Kinetic Bay's service guide. A small machined robot head: graphite
 * shell, glass visor, ember eyes that blink and track the cursor, and an
 * antenna beacon that pulses faster while it is "thinking".
 */
function Kai({ mood }: { mood: React.MutableRefObject<MascotMood> }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.Mesh>(null);
  const beaconMat = useRef<THREE.MeshStandardMaterial>(null);
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
    if (root.current) {
      root.current.position.y = Math.sin(t * 2) * 0.06 + (m.hover ? 0.05 : 0);
      root.current.rotation.z = Math.sin(t * 1.3) * 0.05;
    }
    if (head.current) {
      // the launcher lives bottom-right, so bias the gaze toward the page
      const tx = cursor.current.x * 0.5 - 0.15, ty = cursor.current.y * 0.35 + 0.1;
      head.current.rotation.y += (tx - head.current.rotation.y) * 0.08;
      head.current.rotation.x += (-ty - head.current.rotation.x) * 0.08;
      if (m.hover) head.current.rotation.z = Math.sin(t * 9) * 0.08;
      else head.current.rotation.z *= 0.9;
    }
    if (eyes.current) {
      const b = blink.current;
      b.t += dt;
      let sy = m.hover ? 0.55 : 1; // happy squint on hover
      if (b.t > b.next) {
        const k = (b.t - b.next) / 0.14;
        sy *= k < 1 ? Math.abs(1 - 2 * k) + 0.08 : 1;
        if (k >= 1) { b.t = 0; b.next = 1.8 + Math.random() * 3; }
      }
      eyes.current.scale.y = sy;
    }
    if (beacon.current && beaconMat.current) {
      const speed = m.thinking ? 12 : 3;
      beaconMat.current.emissiveIntensity = 1.6 + Math.sin(t * speed) * 1.2;
      beacon.current.position.y = 1.02 + Math.sin(t * 3) * 0.02;
    }
  });

  const shell = '#24252b';
  return (
    <group ref={root}>
      <group ref={head}>
        {/* shell */}
        <mesh scale={[1, 0.86, 0.9]}>
          <sphereGeometry args={[0.72, 48, 48]} />
          <meshStandardMaterial color={shell} metalness={0.55} roughness={0.32} />
        </mesh>
        {/* orange band */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} scale={[1, 0.9, 1]}>
          <torusGeometry args={[0.68, 0.035, 12, 64]} />
          <meshStandardMaterial color="#F97316" emissive="#EA580C" emissiveIntensity={0.6} metalness={0.3} roughness={0.4} />
        </mesh>
        {/* visor */}
        <mesh position={[0, 0.04, 0.42]} scale={[0.86, 0.5, 0.42]}>
          <sphereGeometry args={[0.62, 40, 40]} />
          <meshStandardMaterial color="#060607" metalness={0.9} roughness={0.08} />
        </mesh>
        {/* eyes */}
        <group ref={eyes} position={[0, 0.06, 0.67]}>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <capsuleGeometry args={[0.055, 0.1, 6, 16]} />
              <meshStandardMaterial color="#FFB347" emissive="#F97316" emissiveIntensity={2.6} />
            </mesh>
          ))}
        </group>
        {/* ears */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.71, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.1, 24]} />
            <meshStandardMaterial color="#F97316" emissive="#7a2a00" emissiveIntensity={0.5} metalness={0.4} roughness={0.35} />
          </mesh>
        ))}
        {/* antenna */}
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.32, 8]} />
          <meshStandardMaterial color="#8b8d94" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh ref={beacon} position={[0, 1.02, 0]}>
          <sphereGeometry args={[0.085, 20, 20]} />
          <meshStandardMaterial ref={beaconMat} color="#FFAB00" emissive="#F97316" emissiveIntensity={2} />
        </mesh>
      </group>
    </group>
  );
}

export default function ChatMascot({ mood, className = '' }: { mood: React.MutableRefObject<MascotMood>; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas camera={{ position: [0, 0.1, 3.1], fov: 38 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} />
        <pointLight position={[-2, -1, 2]} intensity={6} color="#F97316" />
        <pointLight position={[0, 2, -2]} intensity={4} color="#FFAB00" />
        <Kai mood={mood} />
      </Canvas>
    </div>
  );
}

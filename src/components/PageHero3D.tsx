import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

type Shape = 'torus' | 'icosahedron' | 'octahedron' | 'sphere';

function InteractiveGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const targetX = mouse.current.y * 0.15;
    const targetY = mouse.current.x * 0.15;
    ref.current.rotation.x += (targetX - ref.current.rotation.x) * 0.05;
    ref.current.rotation.y += (targetY - ref.current.rotation.y) * 0.05;
  });

  const scale = viewport.width < 5 ? 0.7 : 1.0;

  return <group ref={ref} scale={scale}>{children}</group>;
}

function Shape3D({ shape }: { shape: Shape }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.4;
    mesh.current.rotation.y += 0.006;
  });

  return (
    <Float speed={1.8} rotationIntensity={0.5} floatIntensity={0.6}>
      <mesh ref={mesh}>
        {shape === 'torus' && <torusGeometry args={[1.2, 0.4, 32, 80]} />}
        {shape === 'icosahedron' && <icosahedronGeometry args={[1.4, 2]} />}
        {shape === 'octahedron' && <octahedronGeometry args={[1.5, 2]} />}
        {shape === 'sphere' && <sphereGeometry args={[1.4, 32, 32]} />}
        <MeshDistortMaterial
          color="#F97316"
          emissive="#EA580C"
          emissiveIntensity={0.3}
          distort={0.25}
          speed={1.5}
          roughness={0.15}
          metalness={0.85}
          wireframe={shape === 'icosahedron' || shape === 'octahedron'}
        />
      </mesh>
      {/* Outer glow ring for non-wire shapes */}
      {shape === 'sphere' && (
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[2.0, 0.02, 16, 80]} />
          <meshBasicMaterial color="#F97316" transparent opacity={0.3} />
        </mesh>
      )}
    </Float>
  );
}

function Ring({ delay = 0, radius = 2 }: { delay?: number; radius?: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime + delay;
    mesh.current.rotation.x = Math.sin(t * 0.2) * 0.8;
    mesh.current.rotation.z = t * 0.15;
  });
  return (
    <mesh ref={mesh}>
      <torusGeometry args={[radius, 0.015, 16, 80]} />
      <meshBasicMaterial color="#FB923C" transparent opacity={0.2} />
    </mesh>
  );
}

export default function PageHero3D({ shape = 'icosahedron' }: { shape?: Shape }) {
  return (
    <div className="absolute right-0 top-0 w-full md:w-[45%] h-full pointer-events-none opacity-80">
      <Suspense fallback={null}>
        <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[4, 4, 4]} intensity={1.8} color="#F97316" />
          <pointLight position={[-4, -2, -4]} intensity={0.8} color="#EA580C" />
          <InteractiveGroup>
            <Shape3D shape={shape} />
            <Ring radius={2.2} delay={0} />
            <Ring radius={3.0} delay={2} />
          </InteractiveGroup>
        </Canvas>
      </Suspense>
    </div>
  );
}


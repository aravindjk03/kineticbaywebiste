import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Icosahedron, Torus, Sphere } from '@react-three/drei';
import { useRef, Suspense, useEffect } from 'react';
import { type Mesh, type Group } from 'three';

function InteractiveGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);
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
    const targetX = mouse.current.y * 0.2;
    const targetY = mouse.current.x * 0.2;
    ref.current.rotation.x += (targetX - ref.current.rotation.x) * 0.05;
    ref.current.rotation.y += (targetY - ref.current.rotation.y) * 0.05;
  });

  const scale = viewport.width < 5 ? 0.75 : 1.1;

  return <group ref={ref} scale={scale}>{children}</group>;
}

function CoreOrb() {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = t * 0.15;
    meshRef.current.rotation.y = t * 0.2;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <Icosahedron ref={meshRef} args={[1.4, 4]}>
        <MeshDistortMaterial
          color="#f97316"
          emissive="#ea580c"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.8}
          distort={0.35}
          speed={2}
        />
      </Icosahedron>
    </Float>
  );
}

function InnerCore() {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.5;
  });
  return (
    <Sphere ref={ref} args={[0.6, 32, 32]}>
      <meshStandardMaterial
        color="#fb923c"
        emissive="#f97316"
        emissiveIntensity={0.8}
        roughness={0.1}
        metalness={1}
      />
    </Sphere>
  );
}

function OrbitRing({ radius, speed, tilt, color, thickness }: { radius: number; speed: number; tilt: number; color: string; thickness: number }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * speed;
  });

  return (
    <group ref={ref} rotation={[tilt, 0, 0]}>
      <Torus args={[radius, thickness, 16, 100]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.9}
        />
      </Torus>
    </group>
  );
}

function OrbitingNode({ radius, speed, offset, size }: { radius: number; speed: number; offset: number; size: number }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + offset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.position.y = Math.sin(t * 2) * 0.3;
    ref.current.rotation.y = t;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color="#f97316"
        emissive="#fb923c"
        emissiveIntensity={1}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

function ParticleField() {
  const ref = useRef<Group>(null);
  const count = 80;
  const particles = Array.from({ length: count }, () => ({
    position: [
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
    ] as [number, number, number],
    scale: Math.random() * 0.03 + 0.01,
    speed: Math.random() * 0.5 + 0.2,
  }));

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.05;
  });

  return (
    <group ref={ref}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.position} scale={p.scale}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#fdba74" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 5, 5]} intensity={2} color="#f97316" />
          <pointLight position={[-5, -3, 2]} intensity={1.5} color="#fb923c" />
          <spotLight position={[0, 5, 0]} intensity={1} color="#ffffff" angle={0.5} penumbra={1} />

          <InteractiveGroup>
            <CoreOrb />
            <InnerCore />

            <OrbitRing radius={2.2} speed={0.3} tilt={1.2} color="#f97316" thickness={0.015} />
            <OrbitRing radius={2.8} speed={-0.2} tilt={0.6} color="#fb923c" thickness={0.01} />
            <OrbitRing radius={3.3} speed={0.15} tilt={1.8} color="#fdba74" thickness={0.008} />

            <OrbitingNode radius={2.2} speed={0.8} offset={0} size={0.15} />
            <OrbitingNode radius={2.8} speed={-0.6} offset={2} size={0.12} />
            <OrbitingNode radius={3.3} speed={0.5} offset={4} size={0.1} />

            <ParticleField />
          </InteractiveGroup>
        </Suspense>
      </Canvas>
    </div>
  );
}


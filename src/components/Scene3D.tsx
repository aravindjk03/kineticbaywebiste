import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Icosahedron } from '@react-three/drei';
import { useRef, Suspense } from 'react';
import { type Mesh } from 'three';

function Shape() {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * 0.2;
    ref.current.rotation.y = state.clock.elapsedTime * 0.3;
  });
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
      <Icosahedron ref={ref} args={[1.2, 4]}>
        <MeshDistortMaterial
          color="#f97316"
          emissive="#ea580c"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.85}
          distort={0.3}
          speed={1.5}
        />
      </Icosahedron>
    </Float>
  );
}

export default function Scene3D() {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={2} color="#f97316" />
        <pointLight position={[-5, -3, 2]} intensity={1.5} color="#fb923c" />
        <Shape />
      </Suspense>
    </Canvas>
  );
}

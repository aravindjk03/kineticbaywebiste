import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { logo, machines, face, infinity, globe } from './particleShapes';
// served from /public, so it is referenced by path rather than imported
const logoUrl = '/kineticbay.png';

const vertex = /* glsl */ `
  attribute vec3 aLogo;
  attribute vec3 aMach;
  attribute vec3 aMachB;
  attribute vec2 aFlow;
  attribute vec3 aHuman;
  attribute vec3 aInf;
  attribute vec3 aGlobe;
  attribute float aRand;

  uniform float uStage;
  uniform float uTime;
  uniform float uSize;
  uniform float uMotion;
  uniform float uIntro;
  uniform vec2 uMouse;

  varying vec3 vColor;
  varying float vAlpha;

  const float PI = 3.14159265;

  vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }
  float ease(float t) { return t * t * (3.0 - 2.0 * t); }

  void main() {
    float s = clamp(uStage, 0.0, 4.0);

    // intro: a loose cloud gathers into the Kinetic Bay mark
    float intro = ease(clamp((uIntro - aRand * 0.4) / 0.6, 0.0, 1.0));
    vec3 logo = mix(aGlobe * 2.1 + vec3(0.0, 0.0, -1.5), aLogo, intro);

    // machines: static circuitry, plus packets that stream along the traces
    float packet = step(0.001, aFlow.x);
    float travel = fract(uTime * aFlow.x * uMotion + aFlow.y);
    vec3 mach = mix(aMach, aMachB, travel * packet);

    vec3 gl = aGlobe;
    gl.xz = rot(gl.xz, uTime * 0.18 * uMotion);

    vec3 inf = aInf;
    inf.xy = rot(inf.xy, sin(uTime * 0.3) * 0.05 * uMotion);

    float seg = floor(min(s, 3.999));
    float f = s - seg;
    float t = ease(clamp((f - aRand * 0.35) / 0.65, 0.0, 1.0));

    vec3 from, to;
    if (seg < 1.0)      { from = logo;   to = mach; }
    else if (seg < 2.0) { from = mach;   to = aHuman; }
    else if (seg < 3.0) { from = aHuman; to = inf; }
    else                { from = inf;    to = gl; }
    vec3 p = mix(from, to, t);

    // turbulence peaks mid-morph: particles scatter, then reassemble
    float k = sin(t * PI) * uMotion;
    p += vec3(
      sin(p.y * 2.1 + uTime * 1.3 + aRand * 6.28),
      cos(p.x * 1.9 + uTime * 1.1 + aRand * 3.1),
      sin((p.x + p.y) * 1.4 + uTime)
    ) * k * 0.5;

    p += 0.016 * vec3(sin(uTime * 1.7 + aRand * 40.0), cos(uTime * 1.3 + aRand * 30.0), 0.0) * uMotion;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec2 d = mv.xy - uMouse;
    float dist = length(d);
    mv.xy += normalize(d + 1e-5) * smoothstep(1.3, 0.0, dist) * 0.5 * uMotion;

    gl_Position = projectionMatrix * mv;

    // packets glow a little brighter while they are on the move in the machines scene
    float onMach = (seg < 1.0 ? t : (seg < 2.0 ? 1.0 - t : 0.0));
    float pulse = packet * onMach * sin(travel * PI);
    gl_PointSize = uSize * (0.55 + aRand * 0.85 + pulse * 0.9) / -mv.z;

    // soft apricot palette — warm, not hot
    vec3 apricot = vec3(0.941, 0.541, 0.294);
    vec3 honey   = vec3(0.965, 0.765, 0.420);
    vec3 clay    = vec3(0.851, 0.451, 0.227);
    vec3 cream   = vec3(1.0, 0.925, 0.84);
    vec3 c = mix(clay, apricot, smoothstep(0.0, 0.6, aRand));
    c = mix(c, honey, smoothstep(0.75, 1.0, aRand));
    if (aRand > 0.955) c = cream;
    c = mix(c, cream, pulse * 0.6);
    vColor = c;
    vAlpha = (0.5 + 0.4 * smoothstep(-3.0, 1.5, mv.z + 7.0)) * (0.85 + pulse * 0.3);
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

export interface StoryState {
  stage: number;
  mobile: boolean;
}

// Where the shape sits for each stage (x, y) on desktop; mobile centres it above the copy.
const DESKTOP_OFFSETS = [
  [2.3, 0.15],
  [2.45, 0],
  [-2.3, -0.1],
  [0, -0.35],
  [2.2, 0],
];

function lerpOffsets(stage: number) {
  const i = Math.min(Math.floor(stage), 3);
  const f = Math.min(Math.max(stage - i, 0), 1);
  const e = f * f * (3 - 2 * f);
  const a = DESKTOP_OFFSETS[i], b = DESKTOP_OFFSETS[i + 1];
  return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e];
}

function Points({ state, count, reduced }: { state: MutableRefObject<StoryState>; count: number; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2(99, 99));
  const smoothStage = useRef(0);
  const { size, viewport } = useThree();

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const gl = globe(count);
    const m = machines(count);
    geo.setAttribute('position', new THREE.BufferAttribute(gl.slice(), 3));
    geo.setAttribute('aLogo', new THREE.BufferAttribute(gl.slice(), 3));
    geo.setAttribute('aMach', new THREE.BufferAttribute(m.a, 3));
    geo.setAttribute('aMachB', new THREE.BufferAttribute(m.b, 3));
    geo.setAttribute('aFlow', new THREE.BufferAttribute(m.flow, 2));
    geo.setAttribute('aHuman', new THREE.BufferAttribute(face(count), 3));
    geo.setAttribute('aInf', new THREE.BufferAttribute(infinity(count), 3));
    geo.setAttribute('aGlobe', new THREE.BufferAttribute(gl, 3));
    const r = new Float32Array(count);
    for (let i = 0; i < count; i++) r[i] = Math.random();
    geo.setAttribute('aRand', new THREE.BufferAttribute(r, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);

    const mat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uStage: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: 24 },
        uMotion: { value: reduced ? 0 : 1 },
        uIntro: { value: 0 },
        uMouse: { value: new THREE.Vector2(99, 99) },
      },
    });
    return { geometry: geo, material: mat };
  }, [count, reduced]);

  // trace the real logo once the image is available, then let the cloud gather into it
  const introStart = useRef<number | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = logoUrl;
    img.onload = () => {
      const attr = geometry.getAttribute('aLogo') as THREE.BufferAttribute;
      attr.copyArray(logo(count, img));
      attr.needsUpdate = true;
      introStart.current = performance.now();
    };
  }, [geometry, count]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouse.current.set((x * viewport.width) / 2, (y * viewport.height) / 2);
    };
    const onLeave = () => mouse.current.set(99, 99);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [viewport.width, viewport.height]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const target = state.current.stage;
    smoothStage.current += (target - smoothStage.current) * Math.min(1, dt * 4);
    const s = smoothStage.current;
    const u = material.uniforms;
    u.uStage.value = s;
    u.uTime.value += dt;
    if (introStart.current !== null) u.uIntro.value = reduced ? 1 : Math.min(1, (performance.now() - introStart.current) / 1800);
    u.uSize.value = 24 * Math.min(window.devicePixelRatio, 1.75) * (size.width < 768 ? 0.85 : 1);
    (u.uMouse.value as THREE.Vector2).lerp(mouse.current, 0.12);

    const mobile = state.current.mobile;
    if (mobile) {
      // phones: shape rides in the top third, copy sits below it
      const tall = viewport.height / viewport.width > 1.3;
      g.position.x = 0;
      g.position.y = tall ? viewport.height * 0.29 : 1.0;
      g.scale.setScalar(tall ? Math.min(0.55, viewport.width / 7.5) : 0.6);
    } else {
      const [x, y] = lerpOffsets(s);
      const fit = Math.min(1, viewport.width / 10.5);
      g.position.x = x * Math.min(1.08, viewport.width / 9.3);
      g.position.y = y;
      g.scale.setScalar(fit);
    }
    // gentle parallax tilt toward the cursor
    const mx = mouse.current.x > 50 ? 0 : mouse.current.x / viewport.width;
    const my = mouse.current.y > 50 ? 0 : mouse.current.y / viewport.height;
    g.rotation.y += ((reduced ? 0 : mx * 0.5) - g.rotation.y) * 0.05;
    g.rotation.x += ((reduced ? 0 : -my * 0.3) - g.rotation.x) * 0.05;
  });

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} />
    </group>
  );
}

export default function MorphParticles({
  state, active, count, reduced,
}: { state: MutableRefObject<StoryState>; active: boolean; count: number; reduced: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      aria-hidden="true"
    >
      <Points state={state} count={count} reduced={reduced} />
    </Canvas>
  );
}

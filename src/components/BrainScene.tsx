import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { BrainNode } from "./BrainVisualization";
import { nodeColor } from "./BrainVisualization";

// Fibonacci sphere point distribution.
function fibSphere(n: number, radius = 1) {
  const pts: [number, number, number][] = [];
  const phi = Math.PI * (Math.sqrt(5) - 1);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius]);
  }
  return pts;
}

// A brain-ish deformed sphere: sin/cos wobble on radius.
function brainRadius(theta: number, phi: number) {
  // elongated front-to-back like a cerebrum
  const stretch = 1 + 0.18 * Math.cos(theta) ** 2;
  const flatten = 1 - 0.12 * Math.sin(phi) ** 4;
  // central longitudinal fissure along theta=0
  const fissure = 1 - 0.08 * Math.exp(-((theta) ** 2) / 0.02) * Math.sin(phi);
  // gyri ripples
  const gyri = 1 + 0.03 * Math.sin(8 * phi) * Math.cos(5 * theta);
  return 1.3 * stretch * flatten * fissure * gyri;
}

function BrainCloud() {
  const ref = useRef<THREE.Points>(null!);
  const geo = useMemo(() => {
    const N = 2800;
    const pts = fibSphere(N, 1);
    const arr = new Float32Array(N * 3);
    pts.forEach(([x, y, z], i) => {
      const theta = Math.atan2(z, x);
      const phi = Math.acos(y);
      const r = brainRadius(theta, phi);
      // organic jitter per axis
      arr[i * 3] = x * r + 0.03 * (Math.random() - 0.5);
      arr[i * 3 + 1] = y * r + 0.03 * (Math.random() - 0.5);
      arr[i * 3 + 2] = z * r + 0.03 * (Math.random() - 0.5);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.022}
        color="#2d2d2d"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function NodeMarker({
  node,
  position,
  focused,
  onHover,
}: {
  node: BrainNode;
  position: [number, number, number];
  focused: boolean;
  onHover: (id: string | null) => void;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const color = nodeColor(node);
  const size = 0.045 + node.mastery * 0.05;
  const shouldPulse = node.due || node.retention < 0.5;

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (glowRef.current) {
      const base = focused ? 1.7 : 1.15;
      const pulse = shouldPulse ? 0.25 * (0.5 + 0.5 * Math.sin(t * 2 + node.name.length)) : 0;
      const scale = base + pulse;
      glowRef.current.scale.setScalar(scale);
    }
    if (ref.current && focused) {
      ref.current.scale.setScalar(1.35);
    } else if (ref.current) {
      ref.current.scale.setScalar(1);
    }
  });

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(node.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "";
      }}
    >
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 1.6, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh ref={ref}>
        <sphereGeometry args={[size, 24, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function Nodes({
  nodes,
  focusId,
  onHover,
}: {
  nodes: BrainNode[];
  focusId: string | null | undefined;
  onHover: (id: string | null) => void;
}) {
  const positions = useMemo(() => {
    // Distribute nodes deterministically around the brain surface.
    const base = fibSphere(Math.max(nodes.length, 6), 1);
    return nodes.map((_, i) => {
      const [x, y, z] = base[i];
      const theta = Math.atan2(z, x);
      const phi = Math.acos(y);
      const r = brainRadius(theta, phi) + 0.02;
      return [x * r, y * r, z * r] as [number, number, number];
    });
  }, [nodes]);

  const groupRef = useRef<THREE.Group>(null!);
  useFrame((_s, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.08;
  });

  return (
    <group ref={groupRef}>
      {nodes.map((n, i) => (
        <NodeMarker
          key={n.id}
          node={n}
          position={positions[i]}
          focused={focusId === n.id}
          onHover={onHover}
        />
      ))}
    </group>
  );
}

export default function BrainScene({
  nodes,
  focusId,
  onHover,
}: {
  nodes: BrainNode[];
  focusId: string | null | undefined;
  onHover: (id: string | null) => void;
}) {
  return (
    <Canvas
      camera={{ position: [1.6, 1.1, 3.6], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.8} />
      <group rotation={[0.15, 0, 0.05]}>
        <BrainCloud />
        <Nodes nodes={nodes} focusId={focusId} onHover={onHover} />
      </group>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={false}
        rotateSpeed={0.5}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={(Math.PI * 2) / 3}
      />
    </Canvas>
  );
}
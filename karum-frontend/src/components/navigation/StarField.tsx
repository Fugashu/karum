import { useMemo, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SolarSystem } from "../../types";

export interface HoveredSystem {
  name: string;
  screenX: number;
  screenY: number;
}

interface StarFieldProps {
  systems: SolarSystem[];
  onHover: (hovered: HoveredSystem | null) => void;
  fromSystemId: string | null;
  toSystemId: string | null;
  shopSystemNames: string[];
  routePath: number[] | null;
}

function createStarTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.15, "rgba(232, 168, 50, 0.9)");
  gradient.addColorStop(0.4, "rgba(232, 168, 50, 0.3)");
  gradient.addColorStop(1, "rgba(232, 168, 50, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createHighlightTexture(color: string): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const center = size / 2;

  // Outer glow
  const outer = ctx.createRadialGradient(center, center, 0, center, center, center);
  outer.addColorStop(0, color);
  outer.addColorStop(0.2, color);
  outer.addColorStop(0.5, color.replace("1)", "0.3)"));
  outer.addColorStop(1, color.replace("1)", "0)"));

  ctx.fillStyle = outer;
  ctx.fillRect(0, 0, size, size);

  // Bright center
  const inner = ctx.createRadialGradient(center, center, 0, center, center, size * 0.15);
  inner.addColorStop(0, "rgba(255, 255, 255, 1)");
  inner.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = inner;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const starTexture = createStarTexture();
const fromTexture = createHighlightTexture("rgba(74, 222, 128, 1)");  // green
const toTexture = createHighlightTexture("rgba(248, 113, 113, 1)");   // red
const shopTexture = createHighlightTexture("rgba(96, 165, 250, 1)");  // blue

// Shared normalization logic
function normalizePositions(systems: SolarSystem[]) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const s of systems) {
    if (s.location.x < minX) minX = s.location.x;
    if (s.location.x > maxX) maxX = s.location.x;
    if (s.location.y < minY) minY = s.location.y;
    if (s.location.y > maxY) maxY = s.location.y;
    if (s.location.z < minZ) minZ = s.location.z;
    if (s.location.z > maxZ) maxZ = s.location.z;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;
  const scale = 800;

  return { minX, minY, minZ, rangeX, rangeY, rangeZ, scale };
}

function toNormalized(
  s: SolarSystem,
  norm: ReturnType<typeof normalizePositions>,
): [number, number, number] {
  return [
    ((s.location.x - norm.minX) / norm.rangeX - 0.5) * norm.scale,
    ((s.location.y - norm.minY) / norm.rangeY - 0.5) * norm.scale,
    ((s.location.z - norm.minZ) / norm.rangeZ - 0.5) * norm.scale,
  ];
}

export function StarField({ systems, onHover, fromSystemId, toSystemId, shopSystemNames, routePath }: StarFieldProps) {
  const { camera, size } = useThree();

  const norm = useMemo(() => normalizePositions(systems), [systems]);

  const positions = useMemo(() => {
    const pos = new Float32Array(systems.length * 3);
    for (let i = 0; i < systems.length; i++) {
      const [x, y, z] = toNormalized(systems[i], norm);
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    return pos;
  }, [systems, norm]);

  // Build index maps for fast lookup
  const idToIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < systems.length; i++) {
      map.set(String(systems[i].id), i);
    }
    return map;
  }, [systems]);

  const nameToIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < systems.length; i++) {
      map.set(systems[i].name, i);
    }
    return map;
  }, [systems]);

  // Highlighted point positions
  const fromPos = useMemo(() => {
    if (!fromSystemId) return null;
    const idx = idToIndex.get(fromSystemId);
    if (idx == null) return null;
    return new Float32Array([positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]]);
  }, [fromSystemId, idToIndex, positions]);

  const toPos = useMemo(() => {
    if (!toSystemId) return null;
    const idx = idToIndex.get(toSystemId);
    if (idx == null) return null;
    return new Float32Array([positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]]);
  }, [toSystemId, idToIndex, positions]);

  // Shop marker positions
  const shopPositions = useMemo(() => {
    if (shopSystemNames.length === 0) return null;
    const unique = [...new Set(shopSystemNames)];
    const coords: number[] = [];
    for (const name of unique) {
      const idx = nameToIndex.get(name);
      if (idx == null) continue;
      coords.push(positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]);
    }
    if (coords.length === 0) return null;
    return new Float32Array(coords);
  }, [shopSystemNames, nameToIndex, positions]);

  // Route path line positions
  const routeLinePositions = useMemo(() => {
    if (!routePath || routePath.length < 2) return null;
    const coords: number[] = [];
    for (const sysId of routePath) {
      const idx = idToIndex.get(String(sysId));
      if (idx == null) continue;
      coords.push(positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]);
    }
    if (coords.length < 6) return null; // need at least 2 points
    return new Float32Array(coords);
  }, [routePath, idToIndex, positions]);

  const handlePointerMove = useCallback(
    (e: any) => {
      const intersection = (e as any).intersections?.[0] ?? e;
      const index = intersection?.index;
      if (index == null || index >= systems.length) {
        onHover(null);
        return;
      }

      const vec = new THREE.Vector3(
        positions[index * 3],
        positions[index * 3 + 1],
        positions[index * 3 + 2],
      );
      vec.project(camera);

      const screenX = (vec.x * 0.5 + 0.5) * size.width;
      const screenY = (-vec.y * 0.5 + 0.5) * size.height;

      onHover({ name: systems[index].name, screenX, screenY });
    },
    [systems, positions, camera, size, onHover],
  );

  const handlePointerLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  const hasHighlight = fromSystemId || toSystemId;

  return (
    <>
      {/* All systems — dim when highlighting */}
      <points onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={4}
          map={starTexture}
          color={hasHighlight ? "#8a6a30" : "#e8a832"}
          sizeAttenuation
          transparent
          opacity={hasHighlight ? 0.5 : 0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* From highlight — green */}
      {fromPos && (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[fromPos, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={18}
            map={fromTexture}
            color="#4ade80"
            sizeAttenuation
            transparent
            opacity={1}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* To highlight — red */}
      {toPos && (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[toPos, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={18}
            map={toTexture}
            color="#f87171"
            sizeAttenuation
            transparent
            opacity={1}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* Shop locations — blue */}
      {shopPositions && (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[shopPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={10}
            map={shopTexture}
            color="#60a5fa"
            sizeAttenuation
            transparent
            opacity={0.9}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* Route path line */}
      {routeLinePositions && (
        <line>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[routeLinePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color="#e8a832"
            transparent
            opacity={0.6}
            depthTest={false}
          />
        </line>
      )}
    </>
  );
}

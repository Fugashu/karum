import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ProgressBar } from "../ui/ProgressBar";
import { StarField, type HoveredSystem } from "./StarField";
import type { SolarSystem } from "../../types";

export interface NavigationMapHandle {
  focusSystem: (systemId: string) => void;
}

interface NavigationMapProps {
  systems: SolarSystem[];
  progress: number | null;
  fromCache: boolean;
  fromSystemId: string | null;
  toSystemId: string | null;
  shopSystemNames: string[];
}

export const NavigationMap = forwardRef<NavigationMapHandle, NavigationMapProps>(
  function NavigationMap({ systems, progress, fromCache, fromSystemId, toSystemId, shopSystemNames }, ref) {
    const [loaded, setLoaded] = useState(false);
    const [showLoaded, setShowLoaded] = useState(false);
    const [hovered, setHovered] = useState<HoveredSystem | null>(null);
    const handleHover = useCallback((h: HoveredSystem | null) => setHovered(h), []);
    const [focusTarget, setFocusTarget] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      focusSystem(systemId: string) {
        setFocusTarget(systemId);
      },
    }));

    // Toast after fresh load completes
    useEffect(() => {
      if (fromCache || progress !== 100) return;

      setTimeout(() => {
        setLoaded(true);
        setTimeout(() => setShowLoaded(true), 50);
        setTimeout(() => setShowLoaded(false), 1050);
        setTimeout(() => setLoaded(false), 1550);
      }, 400);
    }, [progress, fromCache]);

    const [canvasReady, setCanvasReady] = useState(false);

    useEffect(() => {
      if (systems.length > 0) {
        requestAnimationFrame(() => setCanvasReady(true));
      }
    }, [systems.length > 0]);

    return (
      <div className="relative flex-1 min-w-0 h-full bg-[#0f0f0f]">
        {systems.length > 0 && (
          <div
            className="w-full h-full transition-opacity duration-[3000ms] ease-out"
            style={{ opacity: canvasReady ? 1 : 0 }}
          >
          <Canvas
            camera={{ position: [0, 0, 500], fov: 60, near: 0.1, far: 10000 }}
            gl={{ antialias: false, alpha: false }}
            style={{ background: "#0f0f0f" }}
          >
            <StarField
              systems={systems}
              onHover={handleHover}
              fromSystemId={fromSystemId}
              toSystemId={toSystemId}
              shopSystemNames={shopSystemNames}
            />
            <CameraController
              systems={systems}
              focusTarget={focusTarget}
              onFocused={() => setFocusTarget(null)}
            />
            <OrbitControls
              enableDamping
              dampingFactor={0.1}
              rotateSpeed={0.5}
              zoomSpeed={1.2}
              panSpeed={0.8}
              minDistance={10}
              maxDistance={3000}
            />
          </Canvas>
          </div>
        )}

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute z-20 pointer-events-none bg-elevated border border-amber px-2.5 py-1.5"
            style={{
              left: hovered.screenX + 12,
              top: hovered.screenY - 8,
            }}
          >
            <span className="text-[10px] text-amber font-bold tracking-wider uppercase whitespace-nowrap">
              {hovered.name}
            </span>
          </div>
        )}

        {/* Bottom-right progress / toast */}
        {(progress !== null && !fromCache) && !loaded && (
          <div className="absolute bottom-4 right-4 w-64 z-10">
            <div className="bg-elevated border border-border px-4 py-3">
              <ProgressBar progress={progress} label="Loading universe" />
            </div>
          </div>
        )}
        {loaded && (
          <div className="absolute bottom-4 right-4 w-64 z-10">
            <div
              className={`bg-elevated border border-border px-4 py-3 transition-opacity duration-500 ${
                showLoaded ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="text-[10px] text-green tracking-wider uppercase">
                Map details up to date
              </span>
            </div>
          </div>
        )}
      </div>
    );
  },
);

// ==========================================================================
// Camera controller — smoothly flies to a target system
// ==========================================================================

function CameraController({
  systems,
  focusTarget,
  onFocused,
}: {
  systems: SolarSystem[];
  focusTarget: string | null;
  onFocused: () => void;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (!focusTarget) return;

    const system = systems.find((s) => String(s.id) === focusTarget);
    if (!system) {
      onFocused();
      return;
    }

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

    const x = ((system.location.x - minX) / rangeX - 0.5) * scale;
    const y = ((system.location.y - minY) / rangeY - 0.5) * scale;
    const z = ((system.location.z - minZ) / rangeZ - 0.5) * scale;

    const point = new THREE.Vector3(x, y, z);
    const dir = point.clone().normalize();
    const pullback = 200;
    const end = point.clone().add(dir.multiplyScalar(pullback));

    const start = camera.position.clone();
    let t = 0;

    function animate() {
      t += 0.02;
      if (t >= 1) {
        camera.position.copy(end);
        camera.lookAt(point);
        onFocused();
        return;
      }
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(start, end, ease);
      camera.lookAt(point);
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [focusTarget, systems, camera, onFocused]);

  return null;
}

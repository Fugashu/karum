import { useState, useEffect, useRef } from "react";

interface ProgressBarProps {
  /** 0–100 */
  progress: number;
  label?: string;
}

const TICK_MS = 16; // ~60fps
const SPEED = 0.8; // % per tick — smooth crawl toward target

export function ProgressBar({ progress, label }: ProgressBarProps) {
  const target = Math.min(100, Math.max(0, progress));
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let last = performance.now();

    function tick(now: number) {
      const dt = now - last;
      if (dt >= TICK_MS) {
        last = now;
        const diff = target - displayRef.current;
        if (Math.abs(diff) < 0.1) {
          displayRef.current = target;
          setDisplay(target);
          return;
        }
        // Move a fraction of the remaining distance, minimum SPEED per tick
        const step = Math.sign(diff) * Math.max(SPEED, Math.abs(diff) * 0.08);
        displayRef.current = Math.abs(step) > Math.abs(diff)
          ? target
          : displayRef.current + step;
        setDisplay(displayRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-text-dim tracking-wider uppercase">{label}</span>
          <span className="text-[10px] text-amber font-bold">{Math.round(display)}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-border">
        <div
          className="h-full bg-amber"
          style={{ width: `${display}%` }}
        />
      </div>
    </div>
  );
}

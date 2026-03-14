interface ProgressBarProps {
  /** 0–100 */
  progress: number;
  label?: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-text-dim tracking-wider uppercase">{label}</span>
          <span className="text-[10px] text-amber font-bold">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-border">
        <div
          className="h-full bg-amber transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

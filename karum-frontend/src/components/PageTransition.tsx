import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div key={location.pathname} className="animate-fade-in flex-1 min-h-0 overflow-auto">
      {children}
    </div>
  );
}

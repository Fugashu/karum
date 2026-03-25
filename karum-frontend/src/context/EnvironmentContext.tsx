import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  type EveEnvironment,
  type EnvironmentConfig,
  ENV_CONFIGS,
  setActiveEnv,
} from "../env-config";

interface EnvironmentContextValue {
  env: EveEnvironment;
  envConfig: EnvironmentConfig;
  setEnv: (env: EveEnvironment) => void;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

function resolveInitialEnv(): EveEnvironment {
  // 1. URL query param
  try {
    const urlEnv = new URLSearchParams(window.location.search).get("env");
    if (urlEnv === "stillness" || urlEnv === "utopia") return urlEnv;
  } catch {
    // SSR or no window
  }
  // 2. localStorage (already read by env-config on module init)
  try {
    const stored = localStorage.getItem("karum:environment");
    if (stored === "stillness" || stored === "utopia") return stored;
  } catch {
    // unavailable
  }
  // 3. Default
  return "utopia";
}

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [env, setEnvState] = useState<EveEnvironment>(resolveInitialEnv);

  const setEnv = useCallback((newEnv: EveEnvironment) => {
    setEnvState(newEnv);
    // Sync imperative layer for service code
    setActiveEnv(newEnv);
    // Update URL without navigation
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("env", newEnv);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  }, []);

  // Keep imperative layer in sync on mount
  setActiveEnv(env);

  return (
    <EnvironmentContext.Provider value={{ env, envConfig: ENV_CONFIGS[env], setEnv }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment(): EnvironmentContextValue {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error("useEnvironment must be used within EnvironmentProvider");
  return ctx;
}

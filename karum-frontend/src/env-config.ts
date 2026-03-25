export type EveEnvironment = "utopia" | "stillness";

export interface EnvironmentConfig {
  label: string;
  worldApi: string;
  karumApi: string;
}

export const ENV_CONFIGS: Record<EveEnvironment, EnvironmentConfig> = {
  stillness: {
    label: "Stillness",
    worldApi:
      import.meta.env.VITE_STILLNESS_WORLD_API ||
      "https://world-api-stillness.live.tech.evefrontier.com",
    karumApi:
      import.meta.env.VITE_STILLNESS_KARUM_API_URL ||
      "https://backend.karum.space",
  },
  utopia: {
    label: "Utopia",
    worldApi:
      import.meta.env.VITE_UTOPIA_WORLD_API ||
      "https://world-api-utopia.uat.pub.evefrontier.com",
    karumApi:
      import.meta.env.VITE_UTOPIA_KARUM_API_URL ||
      "https://utopia.karum.fugashu.dev",
  },
};

const STORAGE_KEY = "karum:environment";

function readInitialEnv(): EveEnvironment {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "stillness" || stored === "utopia") return stored;
  } catch {
    // localStorage unavailable
  }
  return "utopia";
}

/** Currently active environment — used by non-React service code. */
let _activeEnv: EveEnvironment = readInitialEnv();

export function getActiveEnv(): EveEnvironment {
  return _activeEnv;
}

export function setActiveEnv(env: EveEnvironment): void {
  _activeEnv = env;
  try {
    localStorage.setItem(STORAGE_KEY, env);
  } catch {
    // localStorage unavailable
  }
}

export function getEnvConfig(): EnvironmentConfig {
  return ENV_CONFIGS[_activeEnv];
}

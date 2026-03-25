export type EveEnvironment = "utopia" | "stillness";

export interface EnvironmentConfig {
  label: string;
  worldApi: string;
  karumApi: string;
  /** EVE world contracts package ID (differs per environment) */
  worldPackageId: string;
  /** EnergyConfig shared object ID (differs per environment) */
  energyConfigId: string;
  /** Karum vendor contract package ID (differs per environment) */
  vendorPackageId: string;
  /** VendorConfig shared object ID (differs per environment) */
  vendorConfigId: string;
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
    worldPackageId: "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c",
    energyConfigId: "0xd77693d0df5656d68b1b833e2a23cc81eb3875d8d767e7bd249adde82bdbc952",
    vendorPackageId: import.meta.env.VITE_STILLNESS_VENDOR_PACKAGE_ID || "0x1fd59088e0eee7f86f1acc97c8a69808c3bd0060bcaa0c70b0a2de3510535122",
    vendorConfigId: import.meta.env.VITE_STILLNESS_VENDOR_CONFIG_ID || "0x8840910d0117e41ddeddcbc48edba7875fb23f93e511aad2099dd2679d5665ff",
  },
  utopia: {
    label: "Utopia",
    worldApi:
      import.meta.env.VITE_UTOPIA_WORLD_API ||
      "https://world-api-utopia.uat.pub.evefrontier.com",
    karumApi:
      import.meta.env.VITE_UTOPIA_KARUM_API_URL ||
      "https://utopia.karum.fugashu.dev",
    worldPackageId: "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75",
    energyConfigId: "0x9285364e8104c04380d9cc4a001bbdfc81a554aad441c2909c2d3bd52a0c9c62",
    vendorPackageId: import.meta.env.VITE_UTOPIA_VENDOR_PACKAGE_ID || "0x3869cbe91e9c9196ec4599b7384aff4deddc71771a131af219ece0f700aa8586",
    vendorConfigId: import.meta.env.VITE_UTOPIA_VENDOR_CONFIG_ID || "0x5a2e1f7c7ebc90d6680bb9c1e05ad2974d93f756a49179bc849e378fc7064520",
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

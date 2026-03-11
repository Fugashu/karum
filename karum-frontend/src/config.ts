export const config = {
  sui: {
    network: (import.meta.env.VITE_SUI_NETWORK || "testnet") as
      | "testnet"
      | "mainnet"
      | "devnet",
    graphqlUrl: `https://graphql.${import.meta.env.VITE_SUI_NETWORK || "testnet"}.sui.io/graphql`,
    packageId: import.meta.env.VITE_REGISTRY_PACKAGE_ID || "",
    registryId: import.meta.env.VITE_REGISTRY_OBJECT_ID || "",
  },
  eve: {
    /** EVE Frontier world-contracts package on Sui (Stillness tenant) */
    worldPackageId:
      import.meta.env.VITE_EVE_WORLD_PACKAGE_ID ||
      "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c",
    /** World API for reference data (types, solar systems, etc.) */
    worldApi:
      import.meta.env.VITE_WORLD_API ||
      "https://world-api-stillness.live.tech.evefrontier.com",
  },
  useMockData: import.meta.env.VITE_USE_MOCK_DATA === "true",
} as const;

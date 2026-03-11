# KARUM Frontend — React dApp

Read `../CLAUDE.md` first for project context and architecture.

## WHAT THIS IS

A React + TypeScript dApp that cross-references two data sources:
1. **ShopRegistry on Sui** — what shops intend to sell (from the Move contract)
2. **EVE Frontier gateway API** — what's actually happening in-game (online status, real inventory, fuel, coordinates)

Players browse without a wallet. Shop registration requires wallet connection.

## COMMANDS

```bash
npm install                    # Install deps
npm run dev                    # Dev server (localhost:5173)
npm run build                  # Production build
npm run preview                # Preview production build
npx vercel                     # Deploy to Vercel
```

## PHASE 0: API DISCOVERY (DO THIS FIRST)

Before writing any service code, run this script to map the real EVE Frontier API:

```bash
npx tsx scripts/check-gateway.ts
```

Create `scripts/check-gateway.ts`:

```typescript
const GATEWAY = "https://blockchain-gateway-stillness.live.tech.evefrontier.com";

async function explore() {
  console.log("=== EVE Frontier Gateway API Discovery ===\n");

  // 1. All smart assemblies
  console.log("1. GET /smartassemblies");
  try {
    const res = await fetch(`${GATEWAY}/smartassemblies`);
    console.log(`   Status: ${res.status}`);
    const data = await res.json();
    const isArray = Array.isArray(data);
    console.log(`   Is array: ${isArray}`);
    console.log(`   Count: ${isArray ? data.length : "N/A"}`);
    if (isArray && data.length > 0) {
      console.log(`   First item keys: ${Object.keys(data[0]).join(", ")}`);
      console.log(JSON.stringify(data[0], null, 2).slice(0, 2000));
      // Find SSUs
      const types = new Set(data.map((i: any) => i.assemblyType || i.type || "unknown"));
      console.log(`\n   Assembly types: ${[...types].join(", ")}`);
      const ssus = data.filter((i: any) => {
        const t = (i.assemblyType || i.type || "").toLowerCase();
        return t.includes("storage") || t.includes("ssu");
      });
      console.log(`   SSUs found: ${ssus.length}`);
      if (ssus.length > 0) {
        console.log(`\n   SSU sample:`);
        console.log(JSON.stringify(ssus[0], null, 2).slice(0, 3000));
      }
    } else if (!isArray) {
      console.log(`   Top keys: ${Object.keys(data).join(", ")}`);
      console.log(JSON.stringify(data, null, 2).slice(0, 2000));
    }
  } catch (e) { console.log(`   ERROR: ${e}`); }

  // 2. Endpoint scan
  console.log("\n--- Endpoint scan ---");
  for (const ep of ["/smartassemblies", "/types", "/solarsystems", "/characters", "/killmails"]) {
    try {
      const res = await fetch(`${GATEWAY}${ep}`);
      console.log(`GET ${ep} → ${res.status}`);
    } catch (e) { console.log(`GET ${ep} → ERROR`); }
  }

  console.log("\n=== Use these shapes to build types.ts and gateway.ts ===");
}

explore();
```

**After running**: Update `src/types.ts` and `src/services/gateway.ts` to match the ACTUAL response shapes. Do not guess.

## SETUP

### Dependencies

```bash
npm create vite@latest . -- --template react-ts
npm install @mysten/sui @mysten/dapp-kit @mysten/zklogin @tanstack/react-query
npm install -D tailwindcss @tailwindcss/vite
```

### vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

### src/index.css

```css
@import "tailwindcss";
```

### .env.example

```bash
VITE_SUI_NETWORK=testnet
VITE_SUI_FULLNODE_URL=https://fullnode.testnet.sui.io
VITE_REGISTRY_PACKAGE_ID=
VITE_REGISTRY_OBJECT_ID=
VITE_EVE_GATEWAY_HTTP=https://blockchain-gateway-stillness.live.tech.evefrontier.com
VITE_EVE_GATEWAY_WS=wss://blockchain-gateway-stillness.live.tech.evefrontier.com
VITE_USE_MOCK_DATA=true
```

Get `REGISTRY_PACKAGE_ID` and `REGISTRY_OBJECT_ID` from the contract team after deploy.

## SERVICES LAYER

Build these in order. No UI code in services — pure async functions.

### 1. src/config.ts

```typescript
export const config = {
  sui: {
    network: (import.meta.env.VITE_SUI_NETWORK || "testnet") as "testnet" | "mainnet" | "devnet",
    fullnodeUrl: import.meta.env.VITE_SUI_FULLNODE_URL || "https://fullnode.testnet.sui.io",
    packageId: import.meta.env.VITE_REGISTRY_PACKAGE_ID || "",
    registryId: import.meta.env.VITE_REGISTRY_OBJECT_ID || "",
  },
  eve: {
    gatewayHttp: import.meta.env.VITE_EVE_GATEWAY_HTTP || "https://blockchain-gateway-stillness.live.tech.evefrontier.com",
    gatewayWs: import.meta.env.VITE_EVE_GATEWAY_WS || "wss://blockchain-gateway-stillness.live.tech.evefrontier.com",
  },
  useMockData: import.meta.env.VITE_USE_MOCK_DATA === "true",
} as const;
```

### 2. src/services/sui-client.ts

```typescript
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { config } from "../config";

export const suiClient = new SuiClient({
  url: config.sui.fullnodeUrl || getFullnodeUrl(config.sui.network),
});
```

### 3. src/services/gateway.ts

Adapter pattern — raw API response is parsed into our types. If API shape changes, only this file changes.

Key functions:
- `fetchAllSSUs()` — GET all smart assemblies, filter for SSUs
- `fetchSSU(id)` — GET single SSU with full inventory
- `fetchSSUBatch(ids)` — parallel fetch via Promise.allSettled

### 4. src/services/registry-reader.ts

Reads ShopRegistry from Sui. Key function:
- `fetchAllShops(client)` — paginate `getDynamicFields` on the registry object, parse each into `ShopListing`

**Critical**: Table entries in Sui are dynamic fields. You MUST use `getDynamicFields()` + `getDynamicFieldObject()`, NOT `getObject()`.

### 5. src/services/registry-writer.ts

Builds `Transaction` objects for wallet signing. Never signs — that happens in hooks via dapp-kit.

Key functions:
- `buildRegisterShopTx(ssuId, name, desc, system)` → Transaction
- `buildAddOfferTx(ssuId, resourceName, typeId, price, minQty)` → Transaction
- `buildUpdatePriceTx(ssuId, offerIndex, newPrice)` → Transaction
- `buildDeactivateShopTx(ssuId)` → Transaction

**PTB batching**: For registration + offers, batch into ONE Programmable Transaction Block:

```typescript
const tx = new Transaction();
tx.moveCall({ target: `${PACKAGE_ID}::registry::register_shop`, arguments: [...] });
for (const offer of offers) {
  tx.moveCall({ target: `${PACKAGE_ID}::registry::add_offer`, arguments: [...] });
}
// One signature, one tx, all operations
```

**Important**: Clock is always `tx.object("0x6")`. `Transaction` not `TransactionBlock` (old name).

### 6. src/services/mock-data.ts

Realistic mock data matching real API shapes. Feature flag: `VITE_USE_MOCK_DATA=true`.
**This is critical** — if APIs are down during judging, the app must still look great.

## HOOKS

### use-shops.ts (MOST CRITICAL HOOK)

1. Reads all ShopRegistry listings from Sui
2. Batch-fetches live SSU data from gateway for every registered shop
3. Merges into `MergedShop[]` — listing + live data + computed fields (isOnline, fuelLevel, actualStock, hasDiscrepancy)
4. Auto-refreshes every 60 seconds
5. Falls back to mock data if either source fails

### use-filters.ts

Pure logic. Takes `MergedShop[]` + filter state → filtered/sorted array.

Filters: search (name, system, ID), resource type, solar system, online-only toggle
Sort modes: stock quantity, price ascending, distance, fuel level, last updated

### use-register-shop.ts

Wraps dapp-kit `useSignAndExecuteTransaction`. Builds PTB, signs, executes, refreshes shop list on success.

## COMPONENTS (build in this order)

1. **Shared**: StatusDot, FuelBar, ResourceBadge, LoadingSpinner, ErrorState, EmptyState
2. **StatsBar**: four stat cards (online count, total resource, avg price, low fuel)
3. **SearchBar** + **ResourceFilter** + **SystemFilter** + **SortControls**
4. **ShopCard**: main list item — the most complex component
5. **ShopList**: renders array of ShopCards
6. **SectorMap**: canvas 2D minimap of SSU positions
7. **TopSystems**: sidebar ranking systems by shop count
8. **FinderPage**: assembles everything
9. **Header** + **Footer**
10. **RegisterForm** + **OfferInput** + **RegisterPage**

## WALLET INTEGRATION

### main.tsx

```typescript
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const networks = { testnet: { url: getFullnodeUrl("testnet") } };

// Wrap App in: QueryClientProvider > SuiClientProvider > WalletProvider
```

No wallet required for browsing. Only for `/register` page.

## DESIGN SYSTEM

**Aesthetic: Industrial brutalist.** High contrast, raw typography, sharp edges.
Reference: open `karum-design-v3.html` in browser to see every component rendered.

### Colors
```css
--bg:          #0f0f0f     /* page background */
--card:        #1c1c1c     /* cards, panels */
--card-hover:  #232323     /* hover */
--elevated:    #262626     /* modals */
--border:      #333333     /* all borders */
--border-hover:#4a4a4a     /* hover borders */

--text:        #f0ece6     /* primary text (14.8:1 contrast) */
--text-mid:    #b0aaa0     /* body text (8.3:1) */
--text-dim:    #706a60     /* labels, meta (4.2:1) */

--amber:       #e8a832     /* THE accent. Prices, CTA, active filter, favicon. */
--green:       #4ade80     /* online, fuel OK */
--orange:      #fb923c     /* low fuel */
--red:         #f87171     /* offline, danger */
--purple:      #c084fc     /* components resource */
--silver:      #b0b0b0     /* ore resource */
```

### Typography
```
Structure: font-family: 'Space Mono', monospace  — brand, headings, data, labels, nav, buttons
Body:      font-family: 'DM Sans', sans-serif    — paragraphs and descriptions ONLY

<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet" />
```

### Rules (NON-NEGOTIABLE)
- **0px border-radius on EVERYTHING.** Cards, buttons, inputs, badges — all sharp. Only round: status dots, fuel bar fills.
- **No shadows, no gradients, no glow, no blur.** Exception: green box-shadow on online dot.
- **2px borders** on interactive elements. 1px on static.
- **Space Mono** for all structural text. **DM Sans 16px minimum** for body paragraphs only.
- **Amber only for**: prices, primary CTA, active filter, favicon, the A in KARUM. Never as background fill.
- **Offline shops at 55% opacity.**
- **KARUM always all-caps**, Space Mono 700, letter-spacing 0.08–0.14em.
- Minimum card padding: 18px. Minimum gap between cards: 8px. Body text never < 16px.

### Favicon
`public/favicon.svg` — amber square with black K:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" fill="#e8a832"/>
  <text x="16" y="23" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="22" fill="#0c0c0c">K</text>
</svg>
```

## CRITICAL RULES

1. **Run the discovery script FIRST.** Do not guess gateway API shapes.
2. **Use `@mysten/sui` (v1), not `@mysten/sui.js` (deprecated).** Imports: `@mysten/sui/client`, `@mysten/sui/transactions`.
3. **`Transaction`, not `TransactionBlock`.** The class was renamed in v1.
4. **Clock is always `tx.object("0x6")`.** System object. Never create one.
5. **Table = dynamic fields.** Read with `getDynamicFields()` pagination, not `getObject()`.
6. **Always have mock data fallback.** If API is down during judging, app must still render beautifully.
7. **No wallet for browsing.** Only require connection on the register page.
8. **Mobile-first.** Sidebar collapses. Cards are touch-friendly (44px min tap targets). Body text ≥ 16px.
9. **Deploy early.** Live URL by day 5. Share in EVE Frontier Discord before voting starts April 1.
10. **One file at a time.** Services first, then hooks, then components bottom-up.

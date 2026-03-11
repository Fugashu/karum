# KARUM — Implementation Playbook

> Four thousand years ago, Assyrian merchants built the Kārum — humanity's first organized trade
> network. Chains of marketplace colonies connected by caravan routes across Anatolia, with every
> transaction recorded on cuneiform clay tablets. We're rebuilding it for the Frontier.

## MISSION

Win the EVE Frontier × Sui Hackathon 2026 ($80K prize pool).
**Hackathon: March 11–31, 2026. Community voting: April 1–15. Winners announced: April 24.**
We need to be live on Stillness and in players' hands by March 25 at the latest to build momentum before voting starts.

## WHAT WE ARE BUILDING

Karum is a **marketplace registry and resource locator** for EVE Frontier.

**Problem**: SSUs (Smart Storage Units) in EVE Frontier are generic storage containers. There is zero way for a player to discover which SSUs are selling resources, at what price, or whether they are online and stocked. Players waste time flying to SSUs that turn out to be empty, offline, or private.

**Solution** (two parts that talk to each other):

1. **On-chain ShopRegistry** — A Sui Move smart contract. SSU owners call `register_shop()` to list their depot as a public marketplace, declaring what they sell and at what price. The registry is a Sui shared object anyone can read.

2. **React dApp** — An external web app that cross-references the ShopRegistry with live SSU data from the EVE Frontier blockchain gateway API. Players see real-time availability: what's listed for sale (registry), what's actually in stock (gateway API), is the SSU online, fuel level, location, distance.

**Why this wins**: It hits three judging categories (Utility, Technical Implementation, Live Frontier Integration), it uses Sui-native primitives (shared objects, Move, events), and every single player needs it every single session.

---

## ARCHITECTURE OVERVIEW

```
PLAYER (browser/mobile)
       │
       ▼
┌─────────────────────────────────────────┐
│           KARUM FRONTEND                 │
│           (React + Vite)                 │
│                                          │
│  Browse: no wallet needed                │
│  Register shop: wallet required          │
└────────┬───────────────────┬─────────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌──────────────────────────────────┐
│ SUI BLOCKCHAIN   │  │ EVE FRONTIER BLOCKCHAIN GATEWAY   │
│                  │  │                                    │
│ ShopRegistry     │  │ Base URL (Stillness):              │
│ (shared object)  │  │ https://blockchain-gateway-        │
│                  │  │ stillness.live.tech.evefrontier.com │
│ What the shop    │  │                                    │
│ INTENDS to sell: │  │ What's ACTUALLY happening:         │
│ • listed offers  │  │ • SSU online/offline               │
│ • prices         │  │ • real inventory contents          │
│ • owner info     │  │ • fuel level                       │
│ • active/inactive│  │ • coordinates in space             │
│                  │  │ • solar system                     │
│ Read: Sui TS SDK │  │                                    │
│ Write: wallet tx │  │ Read: REST API + WebSocket         │
└─────────────────┘  └──────────────────────────────────┘
```

The **key insight**: Registry provides *intent* (what they want to sell, at what price). Gateway provides *reality* (is it online, is it stocked). Cross-referencing both is the core value. Neither alone is sufficient.

---

## TECH STACK

| Layer | Technology | Why |
|-------|-----------|-----|
| Smart contract | Sui Move | Required by hackathon (Sui × EVE Frontier) |
| Contract tooling | Sui CLI (`sui move build/test/publish`) | Official Sui toolchain |
| Frontend framework | React 18 + TypeScript | Jonas's core strength, fast iteration |
| Build tool | Vite | Fast, modern, great DX |
| Styling | Tailwind CSS v4 | Rapid UI development, responsive out of the box |
| Fonts | Space Mono + DM Sans (Google Fonts) | Brutalist mono-first typography |
| Blockchain SDK | `@mysten/sui` (v1) | Official Sui TypeScript SDK. NOT the deprecated `@mysten/sui.js` |
| Wallet connection | `@mysten/dapp-kit` | Official Sui wallet adapter |
| Query management | `@tanstack/react-query` | Required by dapp-kit, great for caching API calls |
| Charts (optional) | Recharts | If time permits for price history |
| Hosting | Vercel (primary) or Walrus Sites (bonus points) | Fast deploy, reliable |
| IDE | VS Code + Move Analyzer extension | Best Move support |

### Key URLs and Endpoints

```
EVE Frontier Gateway (Stillness):
  HTTP:  https://blockchain-gateway-stillness.live.tech.evefrontier.com
  WS:    wss://blockchain-gateway-stillness.live.tech.evefrontier.com
  Swagger: visit the HTTP URL root in browser to see all endpoints

EVE Frontier Gateway (Nova/Sandbox):
  HTTP:  https://blockchain-gateway-nova.nursery.reitnorf.com

Sui:
  Testnet: https://fullnode.testnet.sui.io
  Mainnet: https://fullnode.mainnet.sui.io

Docs:
  EVE Frontier: https://docs.evefrontier.com
  Sui SDK:      https://sdk.mystenlabs.com/typescript
  Sui Move:     https://docs.sui.io/concepts/sui-move-concepts
  dApp Kit:     https://sdk.mystenlabs.com/dapp-kit

Important constants:
  Sui Clock object ID: 0x6 (system object, always this address)
  Sui System object:   0x5
```

---

## PROJECT STRUCTURE

```
karum/
├── CLAUDE.md                         # THIS FILE — agent instructions
├── README.md                         # Project readme for hackathon submission
│
├── contracts/                        # Sui Move smart contract
│   ├── Move.toml                     # Package manifest
│   ├── sources/
│   │   ├── registry.move             # ShopRegistry contract
│   │   └── registry_tests.move       # Unit tests
│   └── build/                        # Generated by `sui move build`
│
├── frontend/                         # React dApp
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── .env.local                    # Local env vars (git-ignored)
│   ├── .env.example                  # Template
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.tsx                  # App entry + providers
│       ├── App.tsx                   # Router + layout
│       ├── config.ts                 # Env var access
│       ├── types.ts                  # All TypeScript interfaces
│       │
│       ├── services/                 # Data layer (NO UI code here)
│       │   ├── sui-client.ts         # SuiClient singleton
│       │   ├── registry-reader.ts    # Read ShopRegistry from Sui
│       │   ├── registry-writer.ts    # Build transactions for registry writes
│       │   ├── gateway.ts            # EVE Frontier API client
│       │   └── mock-data.ts          # Realistic mock data for dev/fallback
│       │
│       ├── hooks/                    # React hooks
│       │   ├── use-shops.ts          # Main hook: fetches + merges registry + gateway data
│       │   ├── use-filters.ts        # Search, filter, sort logic
│       │   └── use-register-shop.ts  # Shop registration transaction hook
│       │
│       ├── components/               # UI components
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   ├── Footer.tsx
│       │   │   └── MobileNav.tsx
│       │   ├── finder/
│       │   │   ├── SearchBar.tsx
│       │   │   ├── ResourceFilter.tsx
│       │   │   ├── SystemFilter.tsx
│       │   │   ├── SortControls.tsx
│       │   │   ├── ShopCard.tsx
│       │   │   ├── ShopList.tsx
│       │   │   ├── StatsBar.tsx
│       │   │   ├── SectorMap.tsx      # Canvas 2D minimap
│       │   │   └── TopSystems.tsx
│       │   ├── register/
│       │   │   ├── RegisterForm.tsx
│       │   │   └── OfferInput.tsx
│       │   └── shared/
│       │       ├── StatusDot.tsx
│       │       ├── FuelBar.tsx
│       │       ├── ResourceBadge.tsx
│       │       ├── LoadingSpinner.tsx
│       │       ├── ErrorState.tsx
│       │       └── EmptyState.tsx
│       │
│       └── pages/
│           ├── FinderPage.tsx        # Main search/browse page
│           └── RegisterPage.tsx      # Shop registration page
│
└── scripts/
    ├── deploy-contract.sh            # Deploy Move contract
    ├── seed-registry.ts              # Seed test shops
    └── check-gateway.ts              # Explore gateway API shape
```

---

## PHASE 0: DISCOVERY (Do this FIRST — 2 hours max)

Before writing any code, we need to understand the actual EVE Frontier API response format. The docs reference a Swagger UI.

### Step 0.1: Explore the Gateway API

```bash
# Create a discovery script
mkdir -p scripts
```

Create `scripts/check-gateway.ts`:

```typescript
// Run with: npx tsx scripts/check-gateway.ts

const GATEWAY = "https://blockchain-gateway-stillness.live.tech.evefrontier.com";

async function explore() {
  console.log("=== EVE Frontier Gateway API Discovery ===\n");

  // 1. Try to fetch all smart assemblies
  console.log("1. GET /smartassemblies");
  try {
    const res = await fetch(`${GATEWAY}/smartassemblies`);
    console.log(`   Status: ${res.status}`);
    const data = await res.json();
    const isArray = Array.isArray(data);
    console.log(`   Response is array: ${isArray}`);
    console.log(`   Total items: ${isArray ? data.length : "N/A (object)"}`);
    if (isArray && data.length > 0) {
      console.log(`   First item keys: ${Object.keys(data[0]).join(", ")}`);
      console.log(`   First item (truncated):`);
      console.log(JSON.stringify(data[0], null, 2).slice(0, 2000));
    } else if (!isArray) {
      console.log(`   Top-level keys: ${Object.keys(data).join(", ")}`);
      console.log(JSON.stringify(data, null, 2).slice(0, 2000));
    }
  } catch (e) {
    console.log(`   ERROR: ${e}`);
  }

  console.log("\n---\n");

  // 2. Try common endpoint variations
  const endpoints = [
    "/smartassemblies",
    "/smartassemblies?type=SmartStorageUnit",
    "/types",
    "/solarsystems",
    "/characters",
    "/killmails",
    "/smartdeployables",
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${GATEWAY}${ep}`);
      const contentType = res.headers.get("content-type") || "";
      console.log(`GET ${ep} → ${res.status} (${contentType.split(";")[0]})`);
    } catch (e) {
      console.log(`GET ${ep} → ERROR: ${e}`);
    }
  }

  console.log("\n---\n");

  // 3. Try to find an SSU and inspect its structure
  console.log("3. Looking for SSU data...");
  try {
    const res = await fetch(`${GATEWAY}/smartassemblies`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.data || data.smartAssemblies || [];

    // Find SSUs specifically
    const ssus = items.filter((item: any) => {
      const type = item.assemblyType || item.type || item.smartAssemblyType || "";
      return type.toLowerCase().includes("storage") || type.toLowerCase().includes("ssu");
    });

    console.log(`   Found ${ssus.length} SSUs out of ${items.length} total assemblies`);

    if (ssus.length > 0) {
      console.log(`   SSU sample (full object):`);
      console.log(JSON.stringify(ssus[0], null, 2).slice(0, 3000));
    } else if (items.length > 0) {
      // Show the assembly types we found
      const types = new Set(items.map((i: any) =>
        i.assemblyType || i.type || i.smartAssemblyType || "unknown"
      ));
      console.log(`   Assembly types found: ${[...types].join(", ")}`);
      console.log(`   Sample item (full):`);
      console.log(JSON.stringify(items[0], null, 2).slice(0, 3000));
    }
  } catch (e) {
    console.log(`   ERROR: ${e}`);
  }

  console.log("\n=== Discovery complete. Use these shapes to build types.ts ===");
}

explore();
```

```bash
npx tsx scripts/check-gateway.ts
```

**ACTION AFTER RUNNING**: Take the actual response shapes and update `frontend/src/types.ts` and `frontend/src/services/gateway.ts` to match. Do NOT guess. Use real data.

### Step 0.2: Check Swagger Docs

Open in browser: `https://blockchain-gateway-stillness.live.tech.evefrontier.com`
This should show a Swagger UI with all available endpoints. Document every endpoint relevant to SSUs.

---

## PHASE 1: MOVE SMART CONTRACT (Day 1)

### Step 1.1: Initialize Move project

```bash
mkdir -p contracts/sources
cd contracts
```

Create `Move.toml`:
```toml
[package]
name = "karum"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
karum = "0x0"
```

### Step 1.2: Write the ShopRegistry contract

Create `sources/registry.move`:

```move
/// Karum ShopRegistry — The Frontier's first marketplace network.
///
/// SSU owners register their Smart Storage Units as public shops.
/// Each listing declares what the shop sells (resource type, price, min quantity).
/// External dApps cross-reference this registry with live SSU data
/// from the EVE Frontier gateway API to show real-time availability.
module karum::registry {
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::string::{Self, String};

    // ===================== ERRORS =====================

    const E_NOT_OWNER: u64 = 0;
    const E_SHOP_NOT_FOUND: u64 = 1;
    const E_INVALID_OFFER_INDEX: u64 = 2;
    const E_TOO_MANY_OFFERS: u64 = 3;
    const E_NAME_TOO_LONG: u64 = 4;
    const E_DESCRIPTION_TOO_LONG: u64 = 5;
    const E_EMPTY_NAME: u64 = 6;

    const MAX_OFFERS: u64 = 20;
    const MAX_NAME_LEN: u64 = 64;
    const MAX_DESC_LEN: u64 = 280;

    // ===================== STRUCTS =====================

    /// The global shop registry. Created once on publish as a shared object.
    /// Anyone can read. Only shop owners can write their own entries.
    public struct ShopRegistry has key {
        id: UID,
        shops: Table<address, ShopListing>,
        shop_count: u64,
    }

    /// A single shop listing. Keyed by SSU on-chain address in the Table.
    public struct ShopListing has store, drop {
        ssu_id: address,
        owner: address,
        name: String,
        description: String,
        solar_system: String,
        offers: vector<ShopOffer>,
        registered_at: u64,
        last_updated: u64,
        is_active: bool,
    }

    /// A resource offer within a shop listing.
    public struct ShopOffer has store, drop, copy {
        resource_name: String,
        resource_type_id: u64,
        price_per_unit: u64,
        min_quantity: u64,
    }

    // ===================== EVENTS =====================

    public struct ShopRegistered has copy, drop {
        ssu_id: address,
        owner: address,
        name: String,
        solar_system: String,
        timestamp: u64,
    }

    public struct OfferAdded has copy, drop {
        ssu_id: address,
        resource_name: String,
        resource_type_id: u64,
        price_per_unit: u64,
        timestamp: u64,
    }

    public struct PriceUpdated has copy, drop {
        ssu_id: address,
        offer_index: u64,
        old_price: u64,
        new_price: u64,
        timestamp: u64,
    }

    public struct ShopStatusChanged has copy, drop {
        ssu_id: address,
        is_active: bool,
        timestamp: u64,
    }

    // ===================== INIT =====================

    /// Called once on publish. Creates the shared ShopRegistry.
    fun init(ctx: &mut TxContext) {
        let registry = ShopRegistry {
            id: object::new(ctx),
            shops: table::new(ctx),
            shop_count: 0,
        };
        transfer::share_object(registry);
    }

    // ===================== REGISTRATION =====================

    /// Register a new shop or re-register an existing one.
    /// If the SSU is already registered, only the current owner can re-register.
    /// A new registrant can claim an unregistered SSU.
    public entry fun register_shop(
        registry: &mut ShopRegistry,
        ssu_id: address,
        name: vector<u8>,
        description: vector<u8>,
        solar_system: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let name_str = string::utf8(name);
        let desc_str = string::utf8(description);
        let system_str = string::utf8(solar_system);
        let sender = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        // Validate inputs
        assert!(!string::is_empty(&name_str), E_EMPTY_NAME);
        assert!(string::length(&name_str) <= MAX_NAME_LEN, E_NAME_TOO_LONG);
        assert!(string::length(&desc_str) <= MAX_DESC_LEN, E_DESCRIPTION_TOO_LONG);

        // If already registered, only owner can re-register
        if (table::contains(&registry.shops, ssu_id)) {
            let existing = table::borrow(&registry.shops, ssu_id);
            assert!(existing.owner == sender, E_NOT_OWNER);
            table::remove(&mut registry.shops, ssu_id);
        } else {
            registry.shop_count = registry.shop_count + 1;
        };

        let listing = ShopListing {
            ssu_id,
            owner: sender,
            name: name_str,
            description: desc_str,
            solar_system: system_str,
            offers: vector::empty(),
            registered_at: now,
            last_updated: now,
            is_active: true,
        };

        table::add(&mut registry.shops, ssu_id, listing);

        event::emit(ShopRegistered {
            ssu_id,
            owner: sender,
            name: name_str,
            solar_system: system_str,
            timestamp: now,
        });
    }

    // ===================== OFFERS =====================

    /// Add a resource offer to your shop.
    public entry fun add_offer(
        registry: &mut ShopRegistry,
        ssu_id: address,
        resource_name: vector<u8>,
        resource_type_id: u64,
        price_per_unit: u64,
        min_quantity: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&registry.shops, ssu_id), E_SHOP_NOT_FOUND);
        let listing = table::borrow_mut(&mut registry.shops, ssu_id);
        assert!(listing.owner == tx_context::sender(ctx), E_NOT_OWNER);
        assert!(vector::length(&listing.offers) < MAX_OFFERS, E_TOO_MANY_OFFERS);

        let now = clock::timestamp_ms(clock);
        let res_name = string::utf8(resource_name);

        let offer = ShopOffer {
            resource_name: res_name,
            resource_type_id,
            price_per_unit,
            min_quantity,
        };

        vector::push_back(&mut listing.offers, offer);
        listing.last_updated = now;

        event::emit(OfferAdded {
            ssu_id,
            resource_name: res_name,
            resource_type_id,
            price_per_unit,
            timestamp: now,
        });
    }

    /// Remove an offer by its index in the offers vector.
    public entry fun remove_offer(
        registry: &mut ShopRegistry,
        ssu_id: address,
        offer_index: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&registry.shops, ssu_id), E_SHOP_NOT_FOUND);
        let listing = table::borrow_mut(&mut registry.shops, ssu_id);
        assert!(listing.owner == tx_context::sender(ctx), E_NOT_OWNER);
        assert!(offer_index < vector::length(&listing.offers), E_INVALID_OFFER_INDEX);

        vector::remove(&mut listing.offers, offer_index);
        listing.last_updated = clock::timestamp_ms(clock);
    }

    /// Update the price of an existing offer.
    public entry fun update_price(
        registry: &mut ShopRegistry,
        ssu_id: address,
        offer_index: u64,
        new_price: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&registry.shops, ssu_id), E_SHOP_NOT_FOUND);
        let listing = table::borrow_mut(&mut registry.shops, ssu_id);
        assert!(listing.owner == tx_context::sender(ctx), E_NOT_OWNER);
        assert!(offer_index < vector::length(&listing.offers), E_INVALID_OFFER_INDEX);

        let now = clock::timestamp_ms(clock);
        let offer = vector::borrow_mut(&mut listing.offers, offer_index);
        let old_price = offer.price_per_unit;
        offer.price_per_unit = new_price;
        listing.last_updated = now;

        event::emit(PriceUpdated {
            ssu_id,
            offer_index,
            old_price,
            new_price,
            timestamp: now,
        });
    }

    // ===================== STATUS =====================

    /// Deactivate a shop. It remains in the registry but is marked inactive.
    public entry fun deactivate_shop(
        registry: &mut ShopRegistry,
        ssu_id: address,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&registry.shops, ssu_id), E_SHOP_NOT_FOUND);
        let listing = table::borrow_mut(&mut registry.shops, ssu_id);
        assert!(listing.owner == tx_context::sender(ctx), E_NOT_OWNER);
        listing.is_active = false;
        listing.last_updated = clock::timestamp_ms(clock);
        event::emit(ShopStatusChanged { ssu_id, is_active: false, timestamp: clock::timestamp_ms(clock) });
    }

    /// Reactivate a deactivated shop.
    public entry fun reactivate_shop(
        registry: &mut ShopRegistry,
        ssu_id: address,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&registry.shops, ssu_id), E_SHOP_NOT_FOUND);
        let listing = table::borrow_mut(&mut registry.shops, ssu_id);
        assert!(listing.owner == tx_context::sender(ctx), E_NOT_OWNER);
        listing.is_active = true;
        listing.last_updated = clock::timestamp_ms(clock);
        event::emit(ShopStatusChanged { ssu_id, is_active: true, timestamp: clock::timestamp_ms(clock) });
    }

    // ===================== VIEW FUNCTIONS =====================

    public fun shop_count(registry: &ShopRegistry): u64 {
        registry.shop_count
    }

    public fun is_registered(registry: &ShopRegistry, ssu_id: address): bool {
        table::contains(&registry.shops, ssu_id)
    }

    // ===================== TEST HELPERS =====================

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
```

### Step 1.3: Write tests

Create `sources/registry_tests.move`:

```move
#[test_only]
module karum::registry_tests {
    use sui::test_scenario::{Self as ts};
    use sui::clock;
    use karum::registry::{Self, ShopRegistry};

    const OWNER: address = @0xCAFE;
    const OTHER: address = @0xBEEF;
    const SSU_1: address = @0x1001;
    const SSU_2: address = @0x1002;

    #[test]
    fun test_register_shop() {
        let mut scenario = ts::begin(OWNER);
        {
            registry::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));

            registry::register_shop(
                &mut reg, SSU_1,
                b"Oasis Fuel Depot",
                b"Best fuel prices in Nyx Reach",
                b"Nyx Reach",
                &clock, ts::ctx(&mut scenario),
            );

            assert!(registry::shop_count(&reg) == 1);
            assert!(registry::is_registered(&reg, SSU_1));
            assert!(!registry::is_registered(&reg, SSU_2));

            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_add_and_remove_offer() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };

        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));

            registry::register_shop(&mut reg, SSU_1, b"Shop", b"Desc", b"System", &clock, ts::ctx(&mut scenario));
            registry::add_offer(&mut reg, SSU_1, b"Fuel", 77501, 210, 100, &clock, ts::ctx(&mut scenario));
            registry::add_offer(&mut reg, SSU_1, b"Ore", 77502, 80, 50, &clock, ts::ctx(&mut scenario));
            registry::remove_offer(&mut reg, SSU_1, 0, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_update_price() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };

        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));

            registry::register_shop(&mut reg, SSU_1, b"Shop", b"Desc", b"System", &clock, ts::ctx(&mut scenario));
            registry::add_offer(&mut reg, SSU_1, b"Fuel", 77501, 210, 100, &clock, ts::ctx(&mut scenario));
            registry::update_price(&mut reg, SSU_1, 0, 190, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_deactivate_reactivate() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };

        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));

            registry::register_shop(&mut reg, SSU_1, b"Shop", b"Desc", b"System", &clock, ts::ctx(&mut scenario));
            registry::deactivate_shop(&mut reg, SSU_1, &clock, ts::ctx(&mut scenario));
            registry::reactivate_shop(&mut reg, SSU_1, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = registry::E_NOT_OWNER)]
    fun test_non_owner_cannot_add_offer() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };

        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, b"Shop", b"Desc", b"System", &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };

        ts::next_tx(&mut scenario, OTHER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            // This must abort with E_NOT_OWNER
            registry::add_offer(&mut reg, SSU_1, b"Fuel", 77501, 100, 50, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = registry::E_EMPTY_NAME)]
    fun test_empty_name_rejected() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };

        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, b"", b"Desc", b"System", &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_owner_can_re_register() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };

        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));

            registry::register_shop(&mut reg, SSU_1, b"Shop v1", b"Desc", b"System", &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 1);

            registry::register_shop(&mut reg, SSU_1, b"Shop v2", b"New desc", b"System", &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 1); // Count should NOT increase

            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_multiple_shops() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };

        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));

            registry::register_shop(&mut reg, SSU_1, b"Shop A", b"", b"Alpha", &clock, ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_2, b"Shop B", b"", b"Beta", &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 2);

            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }
}
```

### Step 1.4: Build and test

```bash
cd contracts
sui move build
sui move test
```

**Both must pass with zero errors before proceeding.**

### Step 1.5: Deploy

```bash
# Ensure on testnet with gas
sui client switch --env testnet
sui client gas
# If no gas: sui client faucet

# Deploy
sui client publish --gas-budget 100000000

# OUTPUT — save these values:
# Created Objects:
#   PackageID:        0x...  (Immutable)  → VITE_REGISTRY_PACKAGE_ID
#   ShopRegistry ID:  0x...  (Shared)     → VITE_REGISTRY_OBJECT_ID
```

---

## PHASE 2: FRONTEND SCAFFOLD (Day 1–2)

### Step 2.1: Create Vite project

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

### Step 2.2: Install dependencies

```bash
# Sui SDK + wallet
npm install @mysten/sui @mysten/dapp-kit @mysten/zklogin
npm install @tanstack/react-query

# UI
npm install -D tailwindcss @tailwindcss/vite
```

### Step 2.3: Configure Vite

`vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

### Step 2.4: Configure Tailwind

Add to `src/index.css`:
```css
@import "tailwindcss";
```

### Step 2.5: Environment variables

Create `.env.example`:
```bash
VITE_SUI_NETWORK=testnet
VITE_SUI_FULLNODE_URL=https://fullnode.testnet.sui.io
VITE_REGISTRY_PACKAGE_ID=
VITE_REGISTRY_OBJECT_ID=
VITE_EVE_GATEWAY_HTTP=https://blockchain-gateway-stillness.live.tech.evefrontier.com
VITE_EVE_GATEWAY_WS=wss://blockchain-gateway-stillness.live.tech.evefrontier.com
VITE_USE_MOCK_DATA=true
```

Copy to `.env.local` and fill in contract addresses after deploy.

### Step 2.6: Create config.ts

```typescript
export const config = {
  sui: {
    network: (import.meta.env.VITE_SUI_NETWORK || "testnet") as "testnet" | "mainnet" | "devnet",
    fullnodeUrl: import.meta.env.VITE_SUI_FULLNODE_URL || "https://fullnode.testnet.sui.io",
    registryPackageId: import.meta.env.VITE_REGISTRY_PACKAGE_ID || "",
    registryObjectId: import.meta.env.VITE_REGISTRY_OBJECT_ID || "",
  },
  eve: {
    gatewayHttp: import.meta.env.VITE_EVE_GATEWAY_HTTP || "https://blockchain-gateway-stillness.live.tech.evefrontier.com",
    gatewayWs: import.meta.env.VITE_EVE_GATEWAY_WS || "wss://blockchain-gateway-stillness.live.tech.evefrontier.com",
  },
  useMockData: import.meta.env.VITE_USE_MOCK_DATA === "true",
} as const;
```

---

## PHASE 3: SERVICES LAYER (Day 2–3)

Build the data layer. No UI code here. Each service is a pure module of async functions.

**Order of implementation:**
1. `types.ts` — All interfaces (based on Phase 0 discovery)
2. `mock-data.ts` — Realistic mock data matching real API shapes
3. `sui-client.ts` — SuiClient singleton
4. `gateway.ts` — EVE Frontier API client
5. `registry-reader.ts` — Read shop listings from Sui
6. `registry-writer.ts` — Build transaction objects for writes

**Key design rules:**
- `gateway.ts` must have a clean adapter function that transforms raw API responses into our `types.ts` interfaces. If the API shape changes, only this adapter changes.
- `registry-reader.ts` paginates through `getDynamicFields`. Table entries in Sui are dynamic fields on the parent object.
- `registry-writer.ts` returns `Transaction` objects, never signs them. Signing happens in the hook/component layer via dapp-kit.
- `mock-data.ts` is always available as fallback. If API is down during judging, the app still works and looks great.

---

## PHASE 4: HOOKS + UI (Day 3–7)

### Hook: `use-shops.ts`

This is the **most critical piece of code in the entire project**. It:
1. Reads all ShopRegistry listings from Sui
2. Batch-fetches live SSU data from the gateway API for every registered shop
3. Merges them into a `MergedShop[]` array
4. Auto-refreshes every 60 seconds
5. Falls back to mock data if either source fails

### Hook: `use-filters.ts`

Pure logic, no side effects. Takes `MergedShop[]` + filter state, returns filtered/sorted array.

Filters:
- **Search**: fuzzy match on shop name, system, description, SSU ID
- **Resource**: filter to shops that have an offer for this resource type
- **System**: filter to a specific solar system
- **Online only**: toggle (default: true)
- **Sort**: by stock quantity, price (ascending), distance, fuel level, last updated

### UI Components

Build in this order (each depends on the previous):
1. Shared components: `StatusDot`, `FuelBar`, `ResourceBadge`, `LoadingSpinner`, `ErrorState`, `EmptyState`
2. `StatsBar` — four stat cards at the top
3. `SearchBar` + `ResourceFilter` + `SystemFilter` + `SortControls`
4. `ShopCard` — the main list item (most complex component)
5. `ShopList` — renders array of ShopCards
6. `SectorMap` — canvas 2D minimap
7. `TopSystems` — sidebar showing systems ranked by shop count
8. `FinderPage` — assembles everything
9. `Header` + `Footer`
10. `RegisterForm` + `OfferInput` + `RegisterPage`

---

## PHASE 5: REGISTRATION FLOW (Day 7–9)

The shop registration experience must be buttery smooth. This is what SSU owners use.

### Flow:
1. Player navigates to `/register`
2. Connects wallet via dapp-kit `ConnectModal`
3. Enters SSU ID (paste their on-chain address)
4. **Auto-fill**: app calls gateway API to pre-fill name, solar system, current inventory — HUGE UX win
5. Player edits name, description, adds offers (resource + price + min qty)
6. Clicks "Register on Karum"
7. dapp-kit builds and signs the `register_shop` transaction
8. If offers were added, sign `add_offer` transactions (can batch into a single PTB)
9. Success screen: "Your shop is live on Karum!" with link to view it in the finder
10. New listing appears in the finder within seconds (Sui finality is ~400ms)

### Programmable Transaction Block (PTB) optimization:
Instead of separate transactions for register + each offer, batch everything into one PTB:

```typescript
const tx = new Transaction();

// Register
tx.moveCall({
  target: `${PACKAGE_ID}::registry::register_shop`,
  arguments: [
    tx.object(REGISTRY_ID),
    tx.pure.address(ssuId),
    tx.pure.vector("u8", [...new TextEncoder().encode(name)]),
    tx.pure.vector("u8", [...new TextEncoder().encode(description)]),
    tx.pure.vector("u8", [...new TextEncoder().encode(solarSystem)]),
    tx.object("0x6"),
  ],
});

// Add each offer in the same transaction
for (const offer of offers) {
  tx.moveCall({
    target: `${PACKAGE_ID}::registry::add_offer`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.address(ssuId),
      tx.pure.vector("u8", [...new TextEncoder().encode(offer.resourceName)]),
      tx.pure.u64(offer.resourceTypeId),
      tx.pure.u64(offer.pricePerUnit),
      tx.pure.u64(offer.minQuantity),
      tx.object("0x6"),
    ],
  });
}

// One signature, one transaction, all operations
```

---

## PHASE 6: POLISH + DEPLOY (Day 9–14)

### Must-haves before deploy:
- [ ] Mobile responsive (sidebar collapses, cards stack, touch-friendly)
- [ ] Loading states for every async operation
- [ ] Error states with retry buttons
- [ ] Empty states ("No shops found — try broadening your search")
- [ ] Favicon + page title + meta tags
- [ ] Feature flag: `VITE_USE_MOCK_DATA` auto-fallback if API fails

### Deploy to Vercel:
```bash
cd frontend
npx vercel
# Set env vars in Vercel dashboard
```

### Optional but impressive:
- [ ] Deploy frontend to Walrus Sites (shows Sui ecosystem depth)
- [ ] Share links: `karum.xyz/?resource=fuel&system=Nyx+Reach`
- [ ] Price history (store snapshots on each refresh, show sparkline)
- [ ] Arbitrage alerts ("Fuel: 1.8 at Oasis-7 vs 3.2 at Depot-451")
- [ ] Sound effect on new shop registered (via Sui event subscription)

---

## DESIGN SYSTEM

**Aesthetic: Industrial brutalist.** High contrast, raw typography, sharp edges, no decoration.
Reference file: `karum-design-v3.html` — open it in a browser to see every component rendered.

### Color Palette
```
/* Backgrounds — clear contrast steps, each visibly distinct */
--bg:          #0f0f0f     /* page background */
--card:        #1c1c1c     /* cards, panels, inputs */
--card-hover:  #232323     /* interactive hover */
--elevated:    #262626     /* modals, dropdowns */
--border:      #333333     /* all borders */
--border-hover:#4a4a4a     /* hover borders */

/* Text — warm cream, NOT blue-tinted. High contrast. */
--text:        #f0ece6     /* primary — headings, key data (14.8:1 on bg) */
--text-mid:    #b0aaa0     /* secondary — body text, descriptions (8.3:1) */
--text-dim:    #706a60     /* tertiary — labels, timestamps, meta (4.2:1) */

/* Accent — amber. ONE accent color. Used for: prices, CTA, active filter, favicon, brand A. */
--amber:       #e8a832
--amber-soft:  rgba(232,168,50,0.10)   /* badge/filter background */
--amber-border:rgba(232,168,50,0.25)   /* badge/filter border */

/* Status */
--green:       #4ade80     /* online, fuel OK */
--orange:      #fb923c     /* low fuel warning */
--red:         #f87171     /* offline, danger, errors */

/* Resource colors */
--res-fuel:    #e8a832     /* fuel = amber (the main resource) */
--res-ore:     #b0b0b0     /* ore = silver */
--res-comp:    #c084fc     /* components = purple */
--res-alloy:   #4ade80     /* alloys = green */
--res-elec:    #f87171     /* electronics = red */
```

### Typography
```
Structure font: font-family: 'Space Mono', monospace     — brand, headings, data, labels, nav
Body font:      font-family: 'DM Sans', system-ui, sans-serif  — paragraphs, descriptions only

Load via HTML <head>:
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet" />
```

Usage rules:
- **Space Mono 700** for: brand wordmark, section headings, all numbers/prices/quantities, addresses, labels, navigation, buttons
- **Space Mono 400** for: meta text (timestamps, coordinates, IDs)
- **DM Sans 400/500 at 16px minimum** for: body paragraphs and descriptions ONLY
- When in doubt, use Space Mono. Mono is the default. Sans is the exception.

### Brand Rules
- **KARUM** is always all-caps, Space Mono 700, letter-spacing 0.08–0.14em
- The amber A in K**A**RUM is optional but preferred on dark backgrounds
- Never write "Karum" in mixed case in the UI. Kārum diacritical only in historical pitch text.
- Amber (#e8a832) used ONLY for: prices, primary CTA buttons, active filter state, favicon, and the A in KARUM. Never as background fill, glow, or gradient.
- **0px border-radius on everything.** Cards, buttons, inputs, badges — all sharp rectangles. The only round elements are status dots and fuel bar fills.
- **No shadows, no gradients, no glow, no blur.** Exception: subtle green box-shadow on the online status dot.
- **2px borders** on interactive elements (cards, buttons, inputs). 1px on static elements (stat cards, badges).
- **Offline shops rendered at 55% opacity** — instantly distinguishable without reading text.
- Minimum card padding: 18px. Minimum gap between cards: 8px.
- Body text is never smaller than 16px. Mono data labels can go to 10px because numbers are inherently more legible.

### Favicon
Amber (#e8a832) square with black K in Space Mono 700. Sharp corners. No border-radius.
File: `karum-favicon-v2.svg` — copy to `frontend/public/favicon.svg`
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

---

## CRITICAL RULES FOR CLAUDE CODE

1. **Run the discovery script (Phase 0) before building gateway.ts.** Do not guess API shapes.

2. **The Move contract must compile and all tests must pass before deploying.** Run `sui move build && sui move test` every time you change the contract.

3. **Sui Clock is always `0x6`.** Never create a Clock object. Pass `tx.object("0x6")` in transactions.

4. **Table entries are dynamic fields.** Read them with `client.getDynamicFields()` + `client.getDynamicFieldObject()`, not `client.getObject()`.

5. **Use `@mysten/sui` (v1), not `@mysten/sui.js` (deprecated).** Imports are `@mysten/sui/client`, `@mysten/sui/transactions`.

6. **Transaction, not TransactionBlock.** The class is `Transaction` (not `TransactionBlock` which was the old v0 name).

7. **Always have mock data fallback.** If the gateway API or Sui RPC is down during hackathon judging, the app must still render beautifully with realistic mock data.

8. **No wallet required for browsing.** Only require wallet connection for the registration page. The finder page is 100% public.

9. **Mobile-first.** Players check this on their phone while gaming. The sidebar becomes a bottom sheet on mobile. Cards are touch-friendly with 44px minimum tap targets.

10. **Deploy early.** Get a live URL by day 5. Share it in EVE Frontier Discord. Player engagement during voting (April 1-15) is what wins.

11. **One file at a time.** Don't try to write the entire frontend in one shot. Build service layer first, then hooks, then components bottom-up.

12. **Test with real Sui transactions on testnet.** Create a test shop registration flow end-to-end before touching the UI.

---

## COMMANDS REFERENCE

```bash
# Move contract
cd contracts
sui move build                         # Compile
sui move test                          # Run all tests
sui move test --filter test_name       # Run specific test
sui client publish --gas-budget 100000000  # Deploy to current network

# Frontend
cd frontend
npm run dev                            # Dev server (localhost:5173)
npm run build                          # Production build
npm run preview                        # Preview production build
npx vercel                             # Deploy to Vercel

# Discovery
npx tsx scripts/check-gateway.ts       # Explore EVE Frontier API

# Sui CLI helpers
sui client switch --env testnet        # Switch network
sui client gas                         # Check gas balance
sui client faucet                      # Get testnet gas
sui client object <OBJECT_ID>          # Inspect an object
sui client call --package <PKG> --module registry --function register_shop --args ...
```

---

## HACKATHON SUBMISSION CHECKLIST

- [ ] Move contract deployed on Sui testnet (or mainnet if EVE Frontier has migrated)
- [ ] All contract tests passing
- [ ] Frontend deployed to public URL
- [ ] Finder page: browse, search, filter, sort all working
- [ ] Registration page: connect wallet → register shop → see it in finder
- [ ] Mobile responsive
- [ ] Mock data fallback working
- [ ] README.md with project description, screenshots, demo link, architecture diagram
- [ ] Demo video (2-3 minutes): show the problem, show Karum solving it, show registration flow
- [ ] Submit on DeepSurge before March 31 deadline

---

## THE PITCH (for README, demo video, submission)

> **Karum** — The Frontier's First Marketplace Network
>
> Four thousand years ago, Assyrian merchants built the Kārum — humanity's first organized trade network.
> Chains of marketplace colonies connected by caravan routes, with every transaction recorded on clay tablets.
>
> We're rebuilding it for the Frontier.
>
> Karum is an on-chain marketplace registry for EVE Frontier. SSU owners register their shops on Sui,
> declaring what they sell and at what price. The Karum dApp cross-references this registry with live
> game data to show every pilot exactly where to find the resources they need — in real time.
>
> Registry says "sells fuel at 2.1/unit." Gateway confirms "3,200 fuel in stock, SSU online."
> Fly there. Refuel. Survive.
>
> Built with Sui Move + React for the EVE Frontier × Sui Hackathon 2026.
> Theme: "A Toolkit for Civilization." Because every civilization needs a marketplace.

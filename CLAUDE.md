# KARUM — Project Overview

> Four thousand years ago, Assyrian merchants built the Kārum — humanity's first organized trade
> network. Chains of marketplace colonies connected by caravan routes across Anatolia, with every
> transaction recorded on cuneiform clay tablets. We're rebuilding it for the Frontier.

## MISSION

Win the EVE Frontier × Sui Hackathon 2026 ($80K prize pool).
Hackathon: March 11–31. Community voting: April 1–15. Winners announced: April 24.
Live on Stillness and in players' hands by March 25 to build momentum before voting.

## WHAT WE ARE BUILDING

Karum is a **marketplace registry and resource locator** for EVE Frontier.

**Problem**: SSUs (Smart Storage Units) in EVE Frontier are generic storage containers. There is zero way for a player to discover which SSUs are selling resources, at what price, or whether they are online and stocked. Players waste time flying to SSUs that turn out to be empty, offline, or private.

**Solution** (two parts that talk to each other):

1. **On-chain ShopRegistry** (`karum-contracts/`) — A Sui Move smart contract. SSU owners call `register_shop()` to list their depot as a public marketplace, declaring what they sell and at what price. The registry is a Sui shared object anyone can read.

2. **React dApp** (`karum-frontend/`) — An external web app that cross-references the ShopRegistry with live SSU data from the EVE Frontier blockchain gateway API. Players see real-time availability: what's listed for sale (registry), what's actually in stock (gateway API), is the SSU online, fuel level, location, distance.

## ARCHITECTURE

```
PLAYER (browser/mobile)
       │
       ▼
┌─────────────────────────────────────────┐
│         KARUM FRONTEND                   │
│         (React + Vite on Vercel)         │
│                                          │
│  Browse shops: no wallet needed          │
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

**Key insight**: Registry provides *intent* (what they want to sell, at what price). Gateway provides *reality* (is it online, is it stocked). Cross-referencing both is the core value.

## STACK

**Static frontend only. No backend. No database.**

Both data sources (Sui RPC + EVE Gateway) are publicly readable from the browser. React Query caches responses for 60s. There is nothing to persist — the registry lives on-chain, live data comes from the gateway.

```
Vercel (static deploy)
  └── React app
       ├── @mysten/sui  → reads ShopRegistry from Sui RPC (public)
       ├── fetch()       → reads live SSU data from EVE Gateway (public REST)
       ├── React Query   → caches both, refreshes every 60s
       └── dapp-kit      → wallet connection for shop registration only
```

## REPO STRUCTURE

```
karum/
├── CLAUDE.md                          # THIS FILE — shared context
├── README.md                          # Hackathon submission readme
│
├── karum-contracts/                   # Sui Move smart contract
│   ├── CLAUDE.md                      # Contract-specific instructions
│   ├── Move.toml
│   ├── sources/
│   │   ├── registry.move
│   │   └── registry_tests.move
│   └── build/
│
└── karum-frontend/                    # React dApp
    ├── CLAUDE.md                      # Frontend-specific instructions
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    ├── .env.local
    ├── .env.example
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── config.ts
        ├── types.ts
        ├── services/
        │   ├── sui-client.ts
        │   ├── registry-reader.ts
        │   ├── registry-writer.ts
        │   ├── gateway.ts
        │   └── mock-data.ts
        ├── hooks/
        │   ├── use-shops.ts
        │   ├── use-filters.ts
        │   └── use-register-shop.ts
        ├── components/
        │   ├── layout/
        │   ├── finder/
        │   ├── register/
        │   └── shared/
        └── pages/
            ├── FinderPage.tsx
            └── RegisterPage.tsx
```

## SHARED CONSTANTS

These values are needed by BOTH the contract and frontend teams.

```
EVE Frontier Gateway (Stillness):
  HTTP:  https://blockchain-gateway-stillness.live.tech.evefrontier.com
  WS:    wss://blockchain-gateway-stillness.live.tech.evefrontier.com

EVE Frontier Gateway (Nova/Sandbox):
  HTTP:  https://blockchain-gateway-nova.nursery.reitnorf.com

Sui:
  Testnet: https://fullnode.testnet.sui.io
  Mainnet: https://fullnode.mainnet.sui.io

Sui Clock object ID: 0x6 (system object, always this address)

After contract deploy — share these with the frontend team:
  VITE_REGISTRY_PACKAGE_ID=0x...    (Package ID from publish output)
  VITE_REGISTRY_OBJECT_ID=0x...     (ShopRegistry shared object ID)
```

## CONTRACT ↔ FRONTEND INTERFACE

The contract and frontend must agree on these exact function signatures and types.

### Registry entry points (called by frontend via `Transaction.moveCall`):

```
register_shop(registry, ssu_id, name, description, solar_system, clock)
add_offer(registry, ssu_id, resource_name, resource_type_id, price_per_unit, min_quantity, clock)
remove_offer(registry, ssu_id, offer_index, clock)
update_price(registry, ssu_id, offer_index, new_price, clock)
deactivate_shop(registry, ssu_id, clock)
reactivate_shop(registry, ssu_id, clock)
```

### ShopListing fields (read by frontend via `getDynamicFields`):

```
ssu_id:         address
owner:          address
name:           String
description:    String
solar_system:   String
offers:         vector<ShopOffer>
registered_at:  u64 (timestamp ms)
last_updated:   u64 (timestamp ms)
is_active:      bool
```

### ShopOffer fields:

```
resource_name:    String
resource_type_id: u64
price_per_unit:   u64
min_quantity:     u64
```

### Events emitted (frontend can subscribe to these):

```
ShopRegistered { ssu_id, owner, name, solar_system, timestamp }
OfferAdded { ssu_id, resource_name, resource_type_id, price_per_unit, timestamp }
PriceUpdated { ssu_id, offer_index, old_price, new_price, timestamp }
ShopStatusChanged { ssu_id, is_active, timestamp }
```

## HACKATHON TARGETS

| Category | How we score |
|----------|-------------|
| **Utility** | Solves a daily player pain point — finding resources |
| **Technical Implementation** | On-chain Move contract + external dApp + cross-referencing two data sources |
| **Live Frontier Integration** | Deployed on Stillness, real players register real shops |

## THE PITCH

> **KARUM** — The Frontier's First Marketplace Network
>
> Registry says "sells fuel at 2.10." Gateway confirms "3,200 in stock, SSU online."
> Fly there. Refuel. Survive.
>
> Built with Sui Move + React. Theme: "A Toolkit for Civilization."
> Because every civilization needs a marketplace.

## TIMELINE

| Days | Milestone |
|------|-----------|
| 1–2 | Contract deployed + tested. Frontend scaffold with mock data rendering. |
| 3–5 | Gateway API mapped. Services layer done. Finder page working with real data. |
| 6–9 | Registration flow complete. Polish UI. Mobile responsive. |
| 10–14 | Deploy to Vercel. Seed registry. Share in Discord. Record demo video. |
| March 31 | Submit on DeepSurge. |

# KARUM

**The Frontier's First Marketplace Network**

Four thousand years ago, Assyrian merchants built the Karum — humanity's first organized trade network. Twenty-one marketplace colonies across Anatolia, every transaction recorded on clay tablets. We rebuilt it for EVE Frontier.

![KARUM — Shop Finder](./presentation/Screenshot%202026-03-20%20094857.png)

![KARUM — 3D Navigation Map](./presentation/Screenshot%202026-03-20%20094912.png)

![KARUM — Shop Registration](./presentation/Screenshot%202026-03-20%20094926.png)

## What It Does

KARUM is an on-chain marketplace registry for EVE Frontier. SSU owners register shops. Players find resources.

- **Shop registration** — list your SSU as a public shop on-chain via Sui Move. Declare what you sell, set prices, no coding needed
- **Search and filter** — browse shops by resource type, solar system, owner, stock level. Online-only toggle. Sort by stock, price, distance
- **Live cross-referencing** — registry says "sells fuel at 2.10." Game state confirms "3,200 in stock, SSU online." Both together = complete picture
- **Built-in navigation** — get coordinates and navigate directly to SSUs
- **Buy resources** — purchase directly through the dApp
- **Discord bot** — real-time notifications when shops go live or items sell
- **Share button** — share any shop listing with a link
- **Your Shop badge** — connected wallet owners see their own listings highlighted
- **Zero fees** — no platform fees, no middlemen

## Architecture

```
PLAYER (browser)
       |
       v
+----------------------------------------------+
|  KARUM FRONTEND (React + Vite on Vercel)     |
|  Browse: no wallet    Register: wallet req'd |
+----------+-----------------------+-----------+
           |                       |
           v                       v
+-------------------+   +--------------------------+
| SUI BLOCKCHAIN    |   | EVE FRONTIER GAME STATE  |
|                   |   |                          |
| ShopRegistry      |   | World API + Gateway API  |
| (shared object)   |   |                          |
|                   |   | What's ACTUALLY there:   |
| What shops INTEND |   | - SSU online/offline     |
| to sell:          |   | - real inventory         |
| - listed offers   |   | - fuel level             |
| - prices          |   | - coordinates            |
| - owner info      |   | - solar system           |
| - active/inactive |   |                          |
+-------------------+   +--------------------------+

INTENT (registry)  +  REALITY (game state)  =  COMPLETE PICTURE
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Sui Move — `ShopRegistry` shared object with `Table<address, ShopListing>` |
| Frontend | React 19 + TypeScript + Vite, deployed on Vercel |
| Sui integration | `@mysten/sui` v2 + `@mysten/dapp-kit` for wallet connection |
| EVE integration | EVE Frontier World API + Blockchain Gateway API (REST) |
| Styling | Tailwind CSS v4, industrial brutalist design |
| State management | TanStack React Query — caches both data sources, refreshes every 60s |
| Discord bot | Listens to Sui events, posts to configured channels |
| Backend | None. No database. Reads directly from Sui RPC + EVE Frontier APIs |

## How It Works

The core value is cross-referencing two independent data sources:

1. **ShopRegistry on Sui** — an on-chain shared object where SSU owners declare their marketplace intent: what resources they sell, at what price, minimum quantities. Written by shop owners via wallet transactions.

2. **EVE Frontier game state** — the live World API and Blockchain Gateway provide ground truth: is the SSU online? How much fuel does it have? What's actually in the inventory? Where is it in space?

The frontend merges both into a single view. Registry provides intent. Game state provides reality. Discrepancies are surfaced — if a shop lists fuel but the SSU is empty or offline, players see that immediately.

No backend sits between these sources. The browser reads both directly. React Query handles caching and refresh cycles.

## Getting Started

### Prerequisites

- Node.js 18+
- A Sui wallet (for shop registration only — browsing requires no wallet)

### Run Locally

```bash
# Clone
git clone https://github.com/ZettaBite4031/karum.git
cd karum/karum-frontend

# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local — set VITE_USE_MOCK_DATA=true for local dev

# Run
npm run dev
# Open http://localhost:5173
```

### Build for Production

```bash
npm run build
npm run preview
```

## Smart Contract

The `ShopRegistry` is a Sui Move shared object deployed on testnet. Anyone can read. Only shop owners can write their own entries.

### Entry Points

| Function | Description |
|----------|------------|
| `register_shop(registry, ssu_id, name, description, solar_system, clock)` | Register an SSU as a public shop |
| `add_offer(registry, ssu_id, resource_name, resource_type_id, price_per_unit, min_quantity, clock)` | Add a resource offer to your shop |
| `remove_offer(registry, ssu_id, offer_index, clock)` | Remove an offer by index |
| `update_price(registry, ssu_id, offer_index, new_price, clock)` | Update an offer's price |
| `deactivate_shop(registry, ssu_id, clock)` | Mark shop as inactive |
| `reactivate_shop(registry, ssu_id, clock)` | Reactivate a deactivated shop |
| `remove_shop(registry, ssu_id, clock)` | Remove shop entirely from registry |

### Data Structures

```
ShopListing {
    ssu_id, owner, name, description, solar_system,
    offers: vector<ShopOffer>, registered_at, last_updated, is_active
}

ShopOffer {
    resource_name, resource_type_id, price_per_unit, min_quantity
}
```

### Events

`ShopRegistered`, `OfferAdded`, `PriceUpdated`, `ShopStatusChanged` — all emitted on-chain, consumed by the Discord bot for real-time notifications.

## Repo Structure

```
karum/
├── karum-contracts/        # Sui Move smart contract
│   ├── sources/
│   │   ├── registry.move
│   │   └── registry_tests.move
│   └── Move.toml
└── karum-frontend/         # React dApp
    ├── src/
    │   ├── services/       # Sui + EVE API adapters
    │   ├── hooks/          # React Query hooks
    │   ├── components/     # UI components
    │   └── pages/          # Route pages
    ├── package.json
    └── vite.config.ts
```

## Links

| | |
|-|-|
| Live site | [karum.space](https://karum.space) |
| Contract (Sui Explorer) | [`0x0a2e...0389`](https://suiscan.xyz/testnet/object/0x0a2e866038ae44d0233f7facc71a05a8f6b9feab2d9c43c1ae0cb33a61c90389) |
| Registry Object | [`0x0664...8876`](https://suiscan.xyz/testnet/object/0x0664abcacdad4af3d605fc60e0b3c9cbebf38778050e0dfcdd41c48ce0588876) |

## Team

Built by [ZettaBite4031](https://github.com/ZettaBite4031) for the EVE Frontier x Sui Hackathon 2026.

Theme: **A Toolkit for Civilization.** Because every civilization needs a marketplace.

## License

[MIT](./LICENSE)

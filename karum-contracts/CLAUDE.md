# KARUM Contracts — Sui Move Smart Contract

Read `../CLAUDE.md` first for project context and architecture.

## WHAT THIS IS

A Sui Move smart contract that provides an on-chain ShopRegistry. SSU owners register their Smart Storage Units as public marketplace listings. The registry is a shared object anyone can read, but only shop owners can write their own entries.

## COMMANDS

```bash
sui move build                                    # Compile
sui move test                                     # Run all tests
sui move test --filter test_name                  # Run specific test
sui client publish --gas-budget 100000000         # Deploy to current network
sui client switch --env testnet                   # Switch network
sui client gas                                    # Check balance
sui client faucet                                 # Get testnet gas
sui client object <OBJECT_ID>                     # Inspect object
```

## MOVE.TOML

```toml
[package]
name = "karum"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
karum = "0x0"
```

## CONTRACT: sources/registry.move

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
    /// If already registered, only the current owner can re-register.
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

        assert!(!string::is_empty(&name_str), E_EMPTY_NAME);
        assert!(string::length(&name_str) <= MAX_NAME_LEN, E_NAME_TOO_LONG);
        assert!(string::length(&desc_str) <= MAX_DESC_LEN, E_DESCRIPTION_TOO_LONG);

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
            ssu_id, owner: sender, name: name_str, solar_system: system_str, timestamp: now,
        });
    }

    // ===================== OFFERS =====================

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

        vector::push_back(&mut listing.offers, ShopOffer {
            resource_name: res_name, resource_type_id, price_per_unit, min_quantity,
        });
        listing.last_updated = now;

        event::emit(OfferAdded {
            ssu_id, resource_name: res_name, resource_type_id, price_per_unit, timestamp: now,
        });
    }

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
            ssu_id, offer_index, old_price, new_price, timestamp: now,
        });
    }

    // ===================== STATUS =====================

    public entry fun deactivate_shop(
        registry: &mut ShopRegistry, ssu_id: address, clock: &Clock, ctx: &mut TxContext,
    ) {
        assert!(table::contains(&registry.shops, ssu_id), E_SHOP_NOT_FOUND);
        let listing = table::borrow_mut(&mut registry.shops, ssu_id);
        assert!(listing.owner == tx_context::sender(ctx), E_NOT_OWNER);
        listing.is_active = false;
        listing.last_updated = clock::timestamp_ms(clock);
        event::emit(ShopStatusChanged { ssu_id, is_active: false, timestamp: clock::timestamp_ms(clock) });
    }

    public entry fun reactivate_shop(
        registry: &mut ShopRegistry, ssu_id: address, clock: &Clock, ctx: &mut TxContext,
    ) {
        assert!(table::contains(&registry.shops, ssu_id), E_SHOP_NOT_FOUND);
        let listing = table::borrow_mut(&mut registry.shops, ssu_id);
        assert!(listing.owner == tx_context::sender(ctx), E_NOT_OWNER);
        listing.is_active = true;
        listing.last_updated = clock::timestamp_ms(clock);
        event::emit(ShopStatusChanged { ssu_id, is_active: true, timestamp: clock::timestamp_ms(clock) });
    }

    // ===================== VIEW =====================

    public fun shop_count(registry: &ShopRegistry): u64 { registry.shop_count }
    public fun is_registered(registry: &ShopRegistry, ssu_id: address): bool {
        table::contains(&registry.shops, ssu_id)
    }

    // ===================== TEST HELPERS =====================

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) { init(ctx); }
}
```

## TESTS: sources/registry_tests.move

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
        { registry::init_for_testing(ts::ctx(&mut scenario)); };
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, b"Oasis Fuel Depot", b"Best prices", b"Nyx Reach", &clock, ts::ctx(&mut scenario));
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
            registry::register_shop(&mut reg, SSU_1, b"Shop v2", b"New", b"System", &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 1);
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
            registry::register_shop(&mut reg, SSU_1, b"A", b"", b"Alpha", &clock, ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_2, b"B", b"", b"Beta", &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 2);
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }
}
```

## DEPLOY CHECKLIST

1. `sui move build` — must succeed with no errors
2. `sui move test` — all 8 tests must pass
3. `sui client switch --env testnet`
4. `sui client gas` — must have gas (if not: `sui client faucet`)
5. `sui client publish --gas-budget 100000000`
6. From the output, save:
   - **Package ID** (Immutable object) → tell frontend team
   - **ShopRegistry object ID** (Shared object) → tell frontend team
7. Both values go into `karum-frontend/.env.local`

## CRITICAL RULES

1. **Clock is always `0x6`.** Never create a Clock. It's a Sui system object.
2. **`init()` runs automatically on publish.** The `init_for_testing()` wrapper is only for unit tests.
3. **Table entries are dynamic fields.** The frontend reads them via `getDynamicFields` pagination.
4. **Every mutation must check `E_NOT_OWNER`.** No exceptions.
5. **Build and test after every change.** `sui move build && sui move test` before any commit.
6. **String inputs are `vector<u8>`** in entry functions, converted to `String` inside the function body. This is a Sui Move convention for entry functions.

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
    public fun register_shop(
        registry: &mut ShopRegistry,
        ssu_id: address,
        name: String,
        description: String,
        solar_system: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        assert!(!string::is_empty(&name), E_EMPTY_NAME);
        assert!(string::length(&name) <= MAX_NAME_LEN, E_NAME_TOO_LONG);
        assert!(string::length(&description) <= MAX_DESC_LEN, E_DESCRIPTION_TOO_LONG);

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
            name,
            description,
            solar_system,
            offers: vector::empty(),
            registered_at: now,
            last_updated: now,
            is_active: true,
        };

        table::add(&mut registry.shops, ssu_id, listing);

        event::emit(ShopRegistered {
            ssu_id, owner: sender, name, solar_system, timestamp: now,
        });
    }

    // ===================== OFFERS =====================

    public fun add_offer(
        registry: &mut ShopRegistry,
        ssu_id: address,
        resource_name: String,
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

        vector::push_back(&mut listing.offers, ShopOffer {
            resource_name, resource_type_id, price_per_unit, min_quantity,
        });
        listing.last_updated = now;

        event::emit(OfferAdded {
            ssu_id, resource_name, resource_type_id, price_per_unit, timestamp: now,
        });
    }

    public fun remove_offer(
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

    public fun update_price(
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

    public fun deactivate_shop(
        registry: &mut ShopRegistry, ssu_id: address, clock: &Clock, ctx: &mut TxContext,
    ) {
        assert!(table::contains(&registry.shops, ssu_id), E_SHOP_NOT_FOUND);
        let listing = table::borrow_mut(&mut registry.shops, ssu_id);
        assert!(listing.owner == tx_context::sender(ctx), E_NOT_OWNER);
        listing.is_active = false;
        listing.last_updated = clock::timestamp_ms(clock);
        event::emit(ShopStatusChanged { ssu_id, is_active: false, timestamp: clock::timestamp_ms(clock) });
    }

    public fun reactivate_shop(
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

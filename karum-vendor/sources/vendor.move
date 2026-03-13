/// Karum Vendor — SSU vending machine extension.
///
/// Allows SSU owners to sell items from their inventory to visiting players.
/// Uses the EVE Frontier typed witness pattern: SSU owners authorize KarumAuth
/// on their StorageUnit, set prices in VendorConfig, and buyers call buy().
///
/// Flow:
///   1. Owner calls authorize() → registers KarumAuth extension on their SSU
///   2. Owner calls set_price() → stores prices in VendorConfig shared object
///   3. Buyer calls buy() →
///      - Validates price, takes SUI payment
///      - withdraw_item<KarumAuth> from owner's main inventory
///      - deposit_to_owned<KarumAuth> into buyer's inventory slot on the SSU
///      - Transfers SUI to shop owner
#[allow(unused_field)]
module karum_vendor::vendor;

use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::event;
use sui::table::{Self, Table};
use sui::vec_map::{Self, VecMap};
use world::storage_unit::{Self, StorageUnit};
use world::character::Character;
use world::access::OwnerCap;

// ===================== ERRORS =====================

const E_NOT_OWNER: u64 = 0;
const E_NO_PRICES: u64 = 1;
const E_TYPE_NOT_LISTED: u64 = 2;
const E_BELOW_MIN_QUANTITY: u64 = 3;
const E_INSUFFICIENT_PAYMENT: u64 = 4;

// ===================== WITNESS =====================

/// Typed witness for StorageUnit extension authorization.
/// Must be `drop` — the extension system requires Auth: drop.
public struct KarumAuth has drop {}

// ===================== STRUCTS =====================

/// Shared config storing per-SSU item pricing.
/// Created once on publish. Anyone can read, only SSU owners write their own entries.
public struct VendorConfig has key {
    id: UID,
    prices: Table<address, PriceList>,
}

/// Pricing for a single SSU. Keyed by SSU address in the Table.
public struct PriceList has store {
    owner: address,
    items: VecMap<u64, PriceEntry>,
}

/// Price and minimum quantity for a single resource type.
public struct PriceEntry has store, copy, drop {
    price_per_unit: u64,
    min_quantity: u32,
}

// ===================== EVENTS =====================

public struct PurchaseEvent has copy, drop {
    ssu_id: address,
    buyer: address,
    seller: address,
    type_id: u64,
    quantity: u32,
    total_price: u64,
}

public struct PriceSetEvent has copy, drop {
    ssu_id: address,
    type_id: u64,
    price_per_unit: u64,
    min_quantity: u32,
}

// ===================== INIT =====================

fun init(ctx: &mut TxContext) {
    let config = VendorConfig {
        id: object::new(ctx),
        prices: table::new(ctx),
    };
    transfer::share_object(config);
}

// ===================== OWNER: AUTHORIZE EXTENSION =====================

/// SSU owner authorizes the Karum vendor extension on their StorageUnit.
/// Must be called once before buyers can purchase from this SSU.
public fun authorize(
    storage_unit: &mut StorageUnit,
    owner_cap: &OwnerCap<StorageUnit>,
) {
    storage_unit::authorize_extension<KarumAuth>(storage_unit, owner_cap);
}

// ===================== OWNER: SET PRICES =====================

/// SSU owner sets or updates the price for a resource type on their SSU.
/// price_per_unit is in MIST (1 SUI = 1,000,000,000 MIST).
public fun set_price(
    config: &mut VendorConfig,
    ssu_id: address,
    type_id: u64,
    price_per_unit: u64,
    min_quantity: u32,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();

    if (!table::contains(&config.prices, ssu_id)) {
        table::add(&mut config.prices, ssu_id, PriceList {
            owner: sender,
            items: vec_map::empty(),
        });
    };

    let price_list = table::borrow_mut(&mut config.prices, ssu_id);

    // Allow re-claiming an empty PriceList (e.g. after all prices removed)
    if (price_list.owner != sender && vec_map::is_empty(&price_list.items)) {
        price_list.owner = sender;
    };

    assert!(price_list.owner == sender, E_NOT_OWNER);

    if (vec_map::contains(&price_list.items, &type_id)) {
        let entry = vec_map::get_mut(&mut price_list.items, &type_id);
        entry.price_per_unit = price_per_unit;
        entry.min_quantity = min_quantity;
    } else {
        vec_map::insert(&mut price_list.items, type_id, PriceEntry {
            price_per_unit,
            min_quantity,
        });
    };

    event::emit(PriceSetEvent { ssu_id, type_id, price_per_unit, min_quantity });
}

/// SSU owner removes a resource type from their price list.
public fun remove_price(
    config: &mut VendorConfig,
    ssu_id: address,
    type_id: u64,
    ctx: &mut TxContext,
) {
    assert!(table::contains(&config.prices, ssu_id), E_NO_PRICES);
    let price_list = table::borrow_mut(&mut config.prices, ssu_id);
    assert!(price_list.owner == ctx.sender(), E_NOT_OWNER);
    vec_map::remove(&mut price_list.items, &type_id);
}

// ===================== BUYER: PURCHASE =====================

/// Buyer purchases items from an SSU.
///
/// Withdraws from the SSU owner's main inventory and deposits into
/// the buyer's owned inventory on the same SSU. The buyer can then
/// interact with their items in-game at this SSU's location.
///
/// Payment in SUI is transferred directly to the shop owner.
/// Any overpayment is returned to the buyer.
#[allow(lint(self_transfer))]
public fun buy(
    config: &VendorConfig,
    storage_unit: &mut StorageUnit,
    buyer_character: &Character,
    type_id: u64,
    quantity: u32,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext,
) {
    let ssu_id = object::id_address(storage_unit);
    let buyer = ctx.sender();

    // Look up price
    assert!(table::contains(&config.prices, ssu_id), E_NO_PRICES);
    let price_list = table::borrow(&config.prices, ssu_id);
    assert!(vec_map::contains(&price_list.items, &type_id), E_TYPE_NOT_LISTED);

    let price_entry = vec_map::get(&price_list.items, &type_id);
    assert!((quantity as u64) >= (price_entry.min_quantity as u64), E_BELOW_MIN_QUANTITY);

    let total_price = price_entry.price_per_unit * (quantity as u64);
    assert!(coin::value(&payment) >= total_price, E_INSUFFICIENT_PAYMENT);

    // Handle payment: exact amount to seller, change back to buyer
    let seller = price_list.owner;
    if (coin::value(&payment) == total_price) {
        // Exact payment — transfer whole coin to seller
        transfer::public_transfer(payment, seller);
    } else {
        // Overpayment — split exact amount to seller, return rest to buyer
        let exact_payment = coin::split(&mut payment, total_price, ctx);
        transfer::public_transfer(exact_payment, seller);
        transfer::public_transfer(payment, buyer);
    };

    // Withdraw from owner's main inventory → transit Item
    let item = storage_unit::withdraw_item<KarumAuth>(
        storage_unit,
        buyer_character,
        KarumAuth {},
        type_id,
        quantity,
        ctx,
    );

    // Deposit into buyer's owned inventory on this SSU
    storage_unit::deposit_to_owned<KarumAuth>(
        storage_unit,
        buyer_character,
        item,
        KarumAuth {},
        ctx,
    );

    event::emit(PurchaseEvent {
        ssu_id,
        buyer,
        seller,
        type_id,
        quantity,
        total_price,
    });
}

// ===================== VIEW =====================

/// Check if an SSU has prices configured.
public fun has_prices(config: &VendorConfig, ssu_id: address): bool {
    table::contains(&config.prices, ssu_id)
}

// ===================== TEST HELPERS =====================

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) { init(ctx); }

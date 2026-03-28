#[test_only]
module karum::registry_tests {
    use sui::test_scenario::{Self as ts};
    use sui::clock;
    use std::string;
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
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Oasis Fuel Depot"), string::utf8(b"Best prices"), string::utf8(b"Nyx Reach"), &clock, ts::ctx(&mut scenario));
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
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            registry::add_offer(&mut reg, SSU_1, string::utf8(b"Fuel"), 77501, 210, 100, &clock, ts::ctx(&mut scenario));
            registry::add_offer(&mut reg, SSU_1, string::utf8(b"Ore"), 77502, 80, 50, &clock, ts::ctx(&mut scenario));
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
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            registry::add_offer(&mut reg, SSU_1, string::utf8(b"Fuel"), 77501, 210, 100, &clock, ts::ctx(&mut scenario));
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
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
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
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::next_tx(&mut scenario, OTHER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::add_offer(&mut reg, SSU_1, string::utf8(b"Fuel"), 77501, 100, 50, &clock, ts::ctx(&mut scenario));
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
            registry::register_shop(&mut reg, SSU_1, string::utf8(b""), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
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
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop v1"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 1);
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop v2"), string::utf8(b"New"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 1);
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_remove_shop() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 1);
            assert!(registry::is_registered(&reg, SSU_1));
            registry::remove_shop(&mut reg, SSU_1, &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 0);
            assert!(!registry::is_registered(&reg, SSU_1));
            // Can re-register after removal
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop v2"), string::utf8(b"New"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 1);
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = registry::E_NOT_OWNER)]
    fun test_non_owner_cannot_re_register() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::next_tx(&mut scenario, OTHER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Hijacked"), string::utf8(b"Stolen"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = registry::E_NOT_OWNER)]
    fun test_non_owner_cannot_remove_shop() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::next_tx(&mut scenario, OTHER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::remove_shop(&mut reg, SSU_1, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = registry::E_NOT_OWNER)]
    fun test_non_owner_cannot_deactivate() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::next_tx(&mut scenario, OTHER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::deactivate_shop(&mut reg, SSU_1, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = registry::E_NOT_OWNER)]
    fun test_non_owner_cannot_update_price() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            registry::add_offer(&mut reg, SSU_1, string::utf8(b"Fuel"), 77501, 210, 100, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::next_tx(&mut scenario, OTHER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::update_price(&mut reg, SSU_1, 0, 999, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = registry::E_NAME_TOO_LONG)]
    fun test_name_too_long_rejected() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            // 65 bytes — exceeds MAX_NAME_LEN (64)
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"), string::utf8(b""), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = registry::E_SHOP_NOT_FOUND)]
    fun test_add_offer_to_nonexistent_shop() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::add_offer(&mut reg, SSU_1, string::utf8(b"Fuel"), 77501, 210, 100, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = registry::E_INVALID_OFFER_INDEX)]
    fun test_remove_offer_invalid_index() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            registry::add_offer(&mut reg, SSU_1, string::utf8(b"Fuel"), 77501, 210, 100, &clock, ts::ctx(&mut scenario));
            // Index 5 doesn't exist (only index 0)
            registry::remove_offer(&mut reg, SSU_1, 5, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_deactivated_shop_stays_registered() {
        let mut scenario = ts::begin(OWNER);
        { registry::init_for_testing(ts::ctx(&mut scenario)); };
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut reg = ts::take_shared<ShopRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"Shop"), string::utf8(b"Desc"), string::utf8(b"System"), &clock, ts::ctx(&mut scenario));
            registry::deactivate_shop(&mut reg, SSU_1, &clock, ts::ctx(&mut scenario));
            // Shop is still registered even when deactivated
            assert!(registry::is_registered(&reg, SSU_1));
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
            registry::register_shop(&mut reg, SSU_1, string::utf8(b"A"), string::utf8(b""), string::utf8(b"Alpha"), &clock, ts::ctx(&mut scenario));
            registry::register_shop(&mut reg, SSU_2, string::utf8(b"B"), string::utf8(b""), string::utf8(b"Beta"), &clock, ts::ctx(&mut scenario));
            assert!(registry::shop_count(&reg) == 2);
            clock::destroy_for_testing(clock);
            ts::return_shared(reg);
        };
        ts::end(scenario);
    }
}

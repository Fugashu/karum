# Icon Search Commands

Quick reference for finding item icons in the EVE Frontier client cache.

## Setup

The resource index file path (content-addressed, may change after client updates):

```bash
RESINDEX="~/Library/Application Support/EVE Frontier/SharedCache/ResFiles/39/39a92fd505620283_a1bb71f53ede6fe2faa224b8c876223e"
```

Icons are stored at: `karum-backend/data/images/icons/`

## Search for an icon by keyword

```bash
grep -i "KEYWORD" "$RESINDEX" | grep -i "icon\|png"
```

Example:
```bash
grep -i "lens" "$RESINDEX" | grep -i "icon\|png"
grep -i "fuel" "$RESINDEX" | grep -i "icon\|png"
grep -i "pallad\|platinum" "$RESINDEX" | grep -i "icon\|png"
```

## List all frontier item icons

```bash
grep "res:/ui/texture/icons/frontier/" "$RESINDEX" | grep -v "/components/"
```

## List just material icons

```bash
grep "res:/ui/texture/icons/frontier/materials/" "$RESINDEX"
```

## Search all extracted icons locally

```bash
# List all icons
find karum-backend/data/images/icons -name "*.png" | sort

# Search by name
ls karum-backend/data/images/icons/**/*.png | grep -i "KEYWORD"
```

## Map an icon to a type ID

Once you find the right icon file, copy it with the type ID as filename:

```bash
cp karum-backend/data/images/icons/SOURCE.png karum-backend/data/images/icons/TYPE_ID.png
```

Example:
```bash
cp karum-backend/data/images/icons/fuel_lens_64.png karum-backend/data/images/icons/83463.png
```

## Check which items still need icons

```bash
python3 karum-backend/data/images/check_missing.py
```

## View an icon (in Claude Code)

Just read the file — Claude can display PNGs:
```
Read karum-backend/data/images/icons/materials/palladium_ore_01.png
```

## Current mappings

| Type ID | Item Name | Icon Source |
|---------|-----------|-------------|
| 77728 | Sophrogon | frontier_res1.png |
| 77729 | Rough Old Crude Matter | crude1.png |
| 77800 | Feldspar Crystals | materials/feldspar.png |
| 77810 | Platinum-Palladium Matrix | materials/palladium_ore_01.png |
| 77818 | Unstable Fuel | fuel_engine_64.png |
| 83463 | Synthetic Mining Lens | fuel_lens_64.png |
| 84180 | Printed Circuits | materials/printed_circuits.png |
| 84182 | Reinforced Alloys | materials/reinforced_alloys.png |
| 84210 | Carbon Weave | materials/carbon_nanothread.png |
| 88319 | D2 Fuel | keeppixel64/fuel37.png |
| 88335 | D1 Fuel | keeppixel64/fuel22.png |
| 88561 | Thermal Composites | materials/thermal_composites.png |

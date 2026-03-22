# EVE Frontier Item Icon Investigation & Mapping Guide

## Goal

Map the 390 game items (from the World API) to their in-game icons, so we can display item images in the Karum frontend instead of plain text.

## TL;DR — How to Add an Icon for a New Item

1. Find the item's type_id (check `items.json` or the World API)
2. Search for a matching icon in the extracted icons (see [Search Commands](#search-commands))
3. Copy the icon: `cp karum-backend/data/images/icons/SOURCE.png karum-backend/data/images/icons/TYPE_ID.png`
4. Verify: `curl http://localhost:8000/api/items/TYPE_ID/icon` (should return the PNG)
5. Run `python3 karum-backend/data/images/check_missing.py` to confirm

---

## Architecture

```
Frontend (ItemCard)
    |
    | GET /api/items/{type_id}/icon
    v
Backend (FastAPI)
    |
    | Looks for data/images/icons/{type_id}.png
    | Falls back to data/images/icons/default.png
    v
Icon PNGs (64x64 RGBA)
```

The backend serves icons at `GET /api/items/{type_id}/icon`. It looks for `{type_id}.png` in the icons directory, falling back to `default.png`.

---

## What We Investigated

### 1. World API — No Icons Available

The `iconUrl` field on `GET /v2/types/{id}` is **always empty** for all 390 items:

```bash
curl -s "https://world-api-stillness.live.tech.evefrontier.com/v2/types/77818" | python3 -m json.tool
```
```json
{
  "id": 77818,
  "name": "Unstable Fuel",
  "iconUrl": "",
  ...
}
```

The World API Swagger spec (`http://world-api-stillness.live.tech.evefrontier.com/docs/doc.json`) confirms there is no image/icon endpoint. All endpoints:
```
GET /config
GET /health
GET /v2/characters/me/jumps
GET /v2/constellations
GET /v2/ships
GET /v2/solarsystems
GET /v2/tribes
GET /v2/types
```

### 2. EVE Frontier Client Cache — Icons Found Here

The game client stores all assets in a content-addressed cache:

```
~/Library/Application Support/EVE Frontier/SharedCache/
├── index_stillness.txt          # App bundle index (397 lines)
├── ResFiles/                    # Content-addressed blob storage
│   ├── 00/ through ff/          # 256 hex subdirectories
│   └── 39/39a92fd5...           # resfileindex.txt (master resource index)
├── stillness/
│   └── EVE.app/                 # Game binary
└── ...
```

**Resource index format** (`resfileindex.txt`):
```
res:/ui/texture/icons/frontier/fuel_engine_64.png,de/de7aed4fcbfb9ea7_3049bf3b...,3049bf3b...,8459,8532
```
Format: `resource_path,cache_subdir/cache_filename,md5,original_size,stored_size`

**Finding the resource index:**
```bash
# The index path is in the app bundle index
grep "resfileindex" "~/Library/Application Support/EVE Frontier/SharedCache/index_stillness.txt"
# Output: res:/...,39/39a92fd505620283_...,hash,size1,size2
```

### 3. Icon Extraction

We extracted **557 PNG icons** from `res:/ui/texture/icons/frontier/` plus **197 type-ID icons** from model directories.

**Extraction command used:**
```bash
RESFILES="~/Library/Application Support/EVE Frontier/SharedCache/ResFiles"
RESINDEX="$RESFILES/39/39a92fd505620283_a1bb71f53ede6fe2faa224b8c876223e"
DEST="karum-backend/data/images/icons"

grep "res:/ui/texture/icons/frontier/" "$RESINDEX" | while IFS=',' read -r respath cachepath md5 size1 size2 rest; do
    filename=$(echo "$respath" | sed 's|res:/ui/texture/icons/frontier/||')
    dir=$(dirname "$filename")
    [ "$dir" != "." ] && mkdir -p "$DEST/$dir"
    src="$RESFILES/$cachepath"
    [ -f "$src" ] && cp "$src" "$DEST/$filename"
done
```

**Directory structure:**
```
karum-backend/data/images/icons/
├── *.png                        # ~100 top-level (fuel, ore, modules, etc.)
├── materials/                   # 26 crafting material icons
│   ├── printed_circuits.png
│   ├── reinforced_alloys.png
│   ├── thermal_composites.png
│   ├── carbon_nanothread.png
│   ├── feldspar.png
│   ├── palladium_ore_01.png
│   ├── palladium_refined_01.png
│   ├── plutonium.png
│   ├── plutonium_fuel.png
│   ├── sulfides.png
│   ├── nuclear_ore.png
│   ├── catalyst_dust.png
│   ├── chitin_shell.png
│   ├── biopolymers.png
│   ├── technocore.png
│   ├── metabolic_scaffolding.png
│   ├── memory_fragment.png
│   ├── empty_exotronic.png
│   ├── batched_*.png            # 4 batched variants
│   └── masspackaged_*.png       # 4 packaged variants
├── weapons/                     # ammunition, turrets, bombs, energy weapons
│   ├── ammunition/              # AC-A1..A6, BL-A1..A3, GJ-A1..A5, etc.
│   ├── turrets/                 # ac1..5, bl1..4, pl1..4, sg1..5
│   ├── bomblaunchers/           # bl1..21
│   ├── bombs/                   # pb1..19
│   ├── energyweapons/           # en1..6, pg1..3, ul1..7
│   ├── primaryturrets/          # ha1..3, hm1..2, hs1..2, rb1, sc1..3
│   └── sub-turrets/             # gj1..5, pp1..8
├── components/                  # ship components
│   ├── ev/                      # 50+ EV component icons
│   └── synod/                   # 50+ Synod component icons
├── keeppixel64/                 # Keep emergency kit items (fuel22, fuel37, lens1..3, etc.)
├── keep emergency kit/          # More keep items
├── by_typeid/                   # 197 icons named by EVE internal type ID (not Frontier type IDs)
├── {type_id}.png                # Manually mapped icons (see table below)
└── default.png                  # Fallback icon
```

### 4. The FSD Binary — Type-to-Icon Mapping (Partially Cracked)

The mapping between game type_id and icon filename is stored in three binary files:

| File | Size | Purpose |
|------|------|---------|
| `res:/staticdata/types.fsdbinary` | 5 MB | type_id → icon_id, graphic_id, and other fields |
| `res:/staticdata/iconids.fsdbinary` | 466 KB | icon_id → resource path (e.g. `res:/ui/texture/icons/frontier/fuel_engine_64.png`) |
| `res:/staticdata/graphicids.fsdbinary` | 777 KB | graphic_id → 3D model path (not useful for 2D icons) |

**FSD Binary Header** (32 bytes):
```
0x00–0x0F: 16-byte hash/checksum
0x10–0x17: schema identifier (uint64)
0x18–0x1F: data section size = file_size - 32 (uint64)
```

#### iconids.fsdbinary — Successfully Parsed

Contains 3953 resource path strings and 2470 icon_id → path mappings.

**Key finding:** Icon IDs are stored as uint32 exactly **40 bytes before** each `res:/...` string in the data section.

**Extraction script:**
```python
import struct, re, json

with open(ICONIDS_PATH, 'rb') as f:
    data = f.read()

all_strings = list(re.finditer(rb'res:/[^\x00]+', data))
icon_map = {}
for m in all_strings:
    if m.start() >= 40:
        icon_id = struct.unpack_from('<I', data, m.start() - 40)[0]
        path = m.group().decode('ascii', 'replace')
        if icon_id > 0:
            icon_map[icon_id] = path

# Frontier icon IDs are in the 25000–28000 range
# Saved to karum-backend/data/images/iconid_to_path.json
```

**Sample mappings extracted:**
```
25789 → res:/ui/texture/icons/Frontier/Mat1.png
25790 → res:/ui/texture/icons/Frontier/Mat2.png
25791 → res:/ui/texture/icons/Frontier/Fuel1.png
27013 → res:/ui/texture/icons/Frontier/Materials/Metabolic_scaffolding.png
27014 → res:/ui/texture/icons/Frontier/Materials/Nuclear_ore.png
```

#### types.fsdbinary — NOT Fully Parsed

This is the critical missing piece. It maps type_id → icon_id, but we couldn't reliably extract it:

- Contains variable-length records (not fixed-size)
- Type IDs appear at recognizable offsets in the binary
- **graphicID** is at offset +12 from type_id (confirmed), but graphicIDs point to 3D models, not 2D icons
- **iconID** offset could not be reliably determined — records have complex nested structure
- Some type IDs appear multiple times at different offsets (different record types/tables)

**What we tried:**
```python
# Scan for known type IDs and check all nearby offsets for valid icon IDs
for offset in range(0, len(data) - 4, 4):
    val = struct.unpack_from('<I', data, offset)[0]
    if val in known_type_ids:
        # Check offsets +4 through +128 for values in the icon_id range (25000-28000)
        for delta in range(-64, 128, 4):
            v = struct.unpack_from('<I', data, offset + delta)[0]
            if v in valid_icon_ids:
                # Found a match — but false positive rate is high
```

The best delta found was +16 with 11 matches, but they all mapped to generic EVE icons (`res:/ui/texture/icons/11_64_15.png`), not Frontier-specific ones.

#### graphicids.fsdbinary — Parsed but Not Useful

The common IDs from types.fsdbinary (26271, 26471, 27327) turned out to be **graphicIDs**, not iconIDs:
- 27327 → `res:/dx9/model/SpaceObjectFactory/icons/strm_pf_mega_gen_12v02` (3D model)
- 26271 → Gas giant planet model
- 26471 → Lava planet model

### 5. Official Tooling — Phobos (Windows Only)

The [Phobos](https://github.com/pyfa-org/Phobos) project can dump FSD binary data, but:
- Requires **Windows 64-bit** Python
- Uses `.pyd` loader DLLs shipped with the EVE client (in `app:/bin64/`)
- Each `.fsdbinary` has a matching `*Loader.pyd` that Phobos imports at runtime
- **Cannot run on macOS** — the `.pyd` files are Windows DLLs

```python
# From Phobos source (fsd_built.py) — how it works:
# 1. Find matching pairs: app:/bin64/typesLoader.pyd + res:/staticdata/types.fsdbinary
# 2. Import the .pyd loader: importlib.import_module('typesLoader')
# 3. Call: loader_module.load(data_file_path)
# 4. Normalize the returned Python objects
```

### 6. EVE Online SDE — Doesn't Help

The EVE Online Static Data Export (SDE) from Fuzzwork (`https://www.fuzzwork.co.uk/dump/latest/`) has `invTypes.csv` with `iconID` column, but EVE Frontier uses **different type IDs** (77xxx, 82xxx ranges) that don't exist in the EVE Online SDE.

```bash
# Confirmed: no Frontier type IDs in EVE SDE
curl -sL "https://www.fuzzwork.co.uk/dump/latest/invTypes.csv.bz2" | bzcat | grep -E "^(77818|77728),"
# (empty output)
```

### 7. Fuzzy Name Matching — Mostly Failed

Only 17/390 items matched by name similarity between item names and icon filenames. Examples that worked:
- `materials/printed_circuits.png` → "Printed Circuits" (exact match)
- `materials/reinforced_alloys.png` → "Reinforced Alloys" (exact match)

Most items have no name similarity (e.g. "Unstable Fuel" has no matching filename).

---

## Search Commands

### Setup

```bash
# Resource index path (content-addressed, may change after client updates!)
RESINDEX="~/Library/Application Support/EVE Frontier/SharedCache/ResFiles/39/39a92fd505620283_a1bb71f53ede6fe2faa224b8c876223e"

# To find the current path after a client update:
grep "resfileindex.txt" "~/Library/Application Support/EVE Frontier/SharedCache/index_stillness.txt"
```

### Search the client cache for an icon by keyword

```bash
grep -i "KEYWORD" "$RESINDEX" | grep -i "icon\|png"
```

Examples:
```bash
grep -i "lens" "$RESINDEX" | grep -i "icon\|png"
grep -i "fuel" "$RESINDEX" | grep -i "icon\|png"
grep -i "pallad\|platinum" "$RESINDEX" | grep -i "icon\|png"
grep -i "foam\|building" "$RESINDEX" | grep -i "icon\|png"
```

### List all frontier item icons in the cache

```bash
grep "res:/ui/texture/icons/frontier/" "$RESINDEX" | grep -v "/components/"
```

### List material icons only

```bash
grep "res:/ui/texture/icons/frontier/materials/" "$RESINDEX"
```

### Search extracted icons locally

```bash
# All icons
find karum-backend/data/images/icons -name "*.png" | sort

# Search by name
find karum-backend/data/images/icons -name "*.png" | grep -i "KEYWORD"

# List only mapped icons (type_id.png)
ls karum-backend/data/images/icons/[0-9]*.png 2>/dev/null
```

### Extract a specific icon from the cache

```bash
RESFILES="~/Library/Application Support/EVE Frontier/SharedCache/ResFiles"

# 1. Find the cache path from the index
grep -i "fuel_engine" "$RESINDEX"
# Output: res:/...,de/de7aed4fcbfb9ea7_3049bf3b...,hash,size1,size2

# 2. Copy from cache
cp "$RESFILES/de/de7aed4fcbfb9ea7_3049bf3bb9bd61bd54954013a047f874" karum-backend/data/images/icons/MY_ICON.png
```

### Map an icon to a type ID

```bash
# Find the type_id (search items.json)
python3 -c "
import json
with open('karum-backend/data/items.json') as f:
    for item in json.load(f):
        if 'KEYWORD' in item['name'].lower():
            print(f\"{item['id']:>6}  {item['name']:45} [{item.get('categoryName','')}/{item.get('groupName','')}]\")
"

# Copy the icon with type_id as filename
cp karum-backend/data/images/icons/SOURCE.png karum-backend/data/images/icons/TYPE_ID.png
```

### Check mapping status

```bash
# All items
python3 karum-backend/data/images/check_missing.py

# Filter by category (Material, Commodity, Asteroid, Charge, Module, Ship, Deployable)
python3 karum-backend/data/images/check_missing.py --category Material
python3 karum-backend/data/images/check_missing.py --category Commodity
```

### View an icon (in Claude Code)

Just read the PNG file — Claude can display images:
```
Read karum-backend/data/images/icons/materials/palladium_ore_01.png
```

### Refresh items from World API

```bash
curl -s "https://world-api-stillness.live.tech.evefrontier.com/v2/types?limit=400&offset=0" \
  | python3 -c "import sys,json; json.dump(json.load(sys.stdin)['data'], open('karum-backend/data/items.json','w'), indent=2)"
```

---

## Files Produced

| File | Description |
|------|-------------|
| `karum-backend/data/items.json` | All 390 items from World API (refreshable) |
| `karum-backend/data/images/icons/` | 557 extracted PNG icons (64×64 RGBA) + mapped type_id PNGs |
| `karum-backend/data/images/icons/default.png` | Fallback icon for unmapped items |
| `karum-backend/data/images/check_missing.py` | Validates which items have/lack mapped icons |
| `karum-backend/data/images/available_items.txt` | Tab-separated type_id + item name (for reference) |
| `karum-backend/data/images/iconid_to_path.json` | 2470 icon_id → resource path mappings (from iconids.fsdbinary) |
| `karum-backend/data/images/type_to_icon.json` | Partial type_id → graphicID mapping (not useful for 2D icons) |
| `documentation/icon-investigation.md` | This file |

## Current Mappings

| Type ID | Item Name | Icon Source | Category |
|---------|-----------|-------------|----------|
| 77728 | Sophrogon | frontier_res1.png | Material |
| 77729 | Rough Old Crude Matter | crude1.png | Asteroid |
| 77800 | Feldspar Crystals | materials/feldspar.png | Asteroid |
| 77810 | Platinum-Palladium Matrix | materials/palladium_ore_01.png | Asteroid |
| 77818 | Unstable Fuel | fuel_engine_64.png | Commodity |
| 83463 | Synthetic Mining Lens | fuel_lens_64.png | Charge |
| 84180 | Printed Circuits | materials/printed_circuits.png | Material |
| 84182 | Reinforced Alloys | materials/reinforced_alloys.png | Material |
| 84210 | Carbon Weave | materials/carbon_nanothread.png | Material |
| 88319 | D2 Fuel | keeppixel64/fuel37.png | Commodity |
| 88335 | D1 Fuel | keeppixel64/fuel22.png | Commodity |
| 88561 | Thermal Composites | materials/thermal_composites.png | Material |

## What Would Solve the Full Mapping

1. **CCP populates `iconUrl`** in the World API (field exists in schema, just always empty)
2. **Run Phobos on Windows** with EVE Frontier client → dump `types.fsdbinary` → get type_id → icon_id → chain with our `iconid_to_path.json`
3. **Manual mapping** — visually match icons in-game, copy with type_id filename
4. **Community SDE dump** — if someone extracts the full EVE Frontier static data

# EVE Frontier Item Icon Investigation

## Goal

Map the 390 game items (from the World API) to their in-game icons, so we can display item images in the Karum frontend instead of plain text.

## What We Found

### World API Has No Icons

The `iconUrl` field on `/v2/types/{id}` is **always empty** for all 390 items:

```json
{
  "id": 77818,
  "name": "Unstable Fuel",
  "iconUrl": "",
  ...
}
```

There is no image/icon endpoint in the World API at all (confirmed via `doc.json` swagger spec).

### Icons Live in the EVE Frontier Client Cache

The game client stores all assets in a content-addressed cache at:

```
~/Library/Application Support/EVE Frontier/SharedCache/ResFiles/
```

Structure: hex subdirectories (`00/`–`ff/`), each containing files named `{hash}_{hash}`. A master index at `resfileindex.txt` maps resource paths to cache file locations.

### Resource Index Format

```
res:/ui/texture/icons/frontier/fuel_engine_64.png,de/de7aed4f...,3049bf3b...,8459,8532
```

Format: `resource_path,cache_subdir/cache_filename,md5,size1,size2`

### Extracted Icons

We extracted **557 PNG icons** from `res:/ui/texture/icons/frontier/` into `karum-backend/data/images/icons/`. Subdirectories:

```
icons/
├── *.png                    # ~100 top-level icons (fuel, ore, modules, etc.)
├── materials/               # 26 crafting material icons
├── weapons/                 # ammunition, turrets, bombs, energy weapons
│   ├── ammunition/
│   ├── turrets/
│   ├── bomblaunchers/
│   ├── bombs/
│   ├── energyweapons/
│   ├── primaryturrets/
│   └── sub-turrets/
├── components/              # ship components (ev/ and synod/)
├── keeppixel64/             # keep emergency kit items
├── keep emergency kit/      # more keep items
└── by_typeid/               # 197 icons named by type ID (e.g. 27168_64.png)
```

### The Missing Link: FSD Binary Files

The mapping between type_id (e.g. 77818 for "Unstable Fuel") and icon filename (e.g. `fuel_engine_64.png`) is stored in proprietary binary files:

- `res:/staticdata/types.fsdbinary` — maps type_id → icon_id (+ graphicID, and other fields)
- `res:/staticdata/iconids.fsdbinary` — maps icon_id → resource path
- `res:/staticdata/graphicids.fsdbinary` — maps graphicID → 3D model path (not icons)

### What We Learned About FSD Binary Format

**Header** (32 bytes):
- Bytes 0x00–0x0F: 16-byte hash/checksum
- Bytes 0x10–0x17: schema identifier
- Bytes 0x18–0x1F: size of data section (file size minus 32)

**iconids.fsdbinary** (466 KB, 3953 resource path strings):
- We successfully extracted 2470 icon_id → path mappings
- Icon IDs are stored as uint32 exactly **40 bytes before** each `res:/...` string
- Frontier icon IDs are in the 25000–28000 range
- Saved to `karum-backend/data/images/iconid_to_path.json`

**types.fsdbinary** (5 MB, no readable strings):
- Contains variable-length records (not fixed-size)
- Type IDs appear at recognizable offsets, graphicIDs at +12 from type_id
- But icon_id offset could not be reliably determined — records have complex nested structure
- The official tool ([Phobos](https://github.com/pyfa-org/Phobos)) requires **Windows 64-bit + `.pyd` loader DLLs** shipped with the EVE client to parse these files. It cannot run on macOS.

### Fuzzy Name Matching: Mostly Failed

We tried matching item names to icon filenames. Only 17/390 matched (e.g. `materials/printed_circuits.png` → "Printed Circuits"). Most items have no name similarity to their icon filenames.

## Files Produced

| File | Description |
|------|-------------|
| `karum-backend/data/items.json` | All 390 items from World API |
| `karum-backend/data/images/available_items.txt` | Tab-separated type_id + item name |
| `karum-backend/data/images/check_missing.py` | Validates which items have/lack PNG icons |
| `karum-backend/data/images/icons/` | 557 extracted PNG icons (64×64 RGBA) |
| `karum-backend/data/images/iconid_to_path.json` | 2470 icon_id → resource path mappings |
| `karum-backend/data/images/type_to_icon.json` | Partial type_id → graphicID mapping (not useful for 2D icons) |

## What Would Solve This

1. **CCP populates `iconUrl`** in the World API (it's already in the schema, just empty)
2. **Run Phobos on Windows** with the EVE Frontier client to dump `types.fsdbinary` → get type_id → icon_id mapping, then chain with our `iconid_to_path.json`
3. **Manual mapping** — visually match icons to items by looking at them in-game
4. **Community data dump** — if someone has already extracted the full SDE for EVE Frontier

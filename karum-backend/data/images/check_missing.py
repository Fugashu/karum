#!/usr/bin/env python3
"""Check which items from available_items.txt have mapped icons (by type_id).

Icons are mapped when a file named `{type_id}.png` exists in the icons/ directory.
This is separate from the bulk-extracted icons which use their original filenames.

Usage:
    python3 check_missing.py           # Show all missing/found
    python3 check_missing.py --category Material   # Filter by category
"""

import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ICONS_DIR = SCRIPT_DIR / "icons"
ITEMS_FILE = SCRIPT_DIR.parent / "items.json"


def main():
    if not ITEMS_FILE.exists():
        print(f"ERROR: {ITEMS_FILE} not found")
        return

    with open(ITEMS_FILE) as f:
        items = json.load(f)

    # Optional category filter
    cat_filter = None
    if len(sys.argv) > 2 and sys.argv[1] == "--category":
        cat_filter = sys.argv[2]

    if cat_filter:
        items = [i for i in items if i.get("categoryName", "").lower() == cat_filter.lower()]

    # Check which type_id.png files exist
    mapped_ids = {int(p.stem) for p in ICONS_DIR.glob("*.png") if p.stem.isdigit()}

    missing = []
    found = []
    for item in sorted(items, key=lambda x: x["name"]):
        type_id = item["id"]
        name = item["name"]
        category = item.get("categoryName", "")
        group = item.get("groupName", "")
        if type_id in mapped_ids:
            found.append((type_id, name, category, group))
        else:
            missing.append((type_id, name, category, group))

    total_icons = len(list(ICONS_DIR.rglob("*.png")))

    print(f"Total items:      {len(items)}")
    print(f"Mapped (by ID):   {len(found)}")
    print(f"Missing mapping:  {len(missing)}")
    print(f"Total icon files: {total_icons}")
    if cat_filter:
        print(f"Category filter:  {cat_filter}")
    print()

    if found:
        print("--- MAPPED ---")
        for type_id, name, category, group in found:
            print(f"  {type_id:>6}  {name:45} [{category}/{group}]")

    if missing:
        print()
        print("--- MISSING ---")
        for type_id, name, category, group in missing:
            print(f"  {type_id:>6}  {name:45} [{category}/{group}]")


if __name__ == "__main__":
    main()

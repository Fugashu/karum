#!/bin/sh
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

printf '%bsuiup uninstaller%b\n\n' "${CYAN}" "${NC}"

# Find where suiup is installed
SUIUP_BIN=$(command -v suiup 2>/dev/null)
if [ -z "$SUIUP_BIN" ]; then
    printf '%bsuiup not found in PATH, nothing to uninstall.%b\n' "${RED}" "${NC}"
    exit 0
fi

INSTALL_DIR=$(dirname "$SUIUP_BIN")
printf 'Found suiup at: %s\n' "$SUIUP_BIN"

# Remove binaries managed by suiup
for binary in sui mvr walrus site-builder; do
    bin_path="$INSTALL_DIR/$binary"
    if [ -f "$bin_path" ]; then
        printf 'Removing %s\n' "$bin_path"
        rm -f "$bin_path"
    fi
done

# Remove suiup itself
printf 'Removing %s\n' "$SUIUP_BIN"
rm -f "$SUIUP_BIN"

# Remove suiup data directory
SUIUP_DATA="$HOME/.suiup"
if [ -d "$SUIUP_DATA" ]; then
    printf 'Removing %s\n' "$SUIUP_DATA"
    rm -rf "$SUIUP_DATA"
fi

# Remove walrus config if present
WALRUS_CONFIG="$HOME/.config/walrus"
if [ -d "$WALRUS_CONFIG" ]; then
    printf 'Removing %s\n' "$WALRUS_CONFIG"
    rm -rf "$WALRUS_CONFIG"
fi

printf '\n%bsuiup and managed binaries removed.%b\n' "${GREEN}" "${NC}"
printf 'You may want to also clean up:\n'
printf '  - PATH export in your shell profile (~/.bashrc, ~/.zshrc)\n'
printf '  - ~/.sui (wallet config + keystore — contains your private keys!)\n'

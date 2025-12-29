I d#!/usr/bin/env bash

# Check if we're on NixOS and set up electron path if needed
if [ -f /etc/NIXOS ] || [ -n "$NIX_STORE" ]; then
    # We're on NixOS, need to find the electron path
    if command -v electron &> /dev/null; then
        # Electron is in PATH, find its store path
        ELECTRON_BIN=$(which electron)
        ELECTRON_STORE_PATH=$(dirname "$ELECTRON_BIN")
        export ELECTRON_OVERRIDE_DIST_PATH="$ELECTRON_STORE_PATH"
        echo "NixOS detected: Using electron from $ELECTRON_STORE_PATH"
    elif [ -d /nix/store ]; then
        # Try to find electron in nix store matching our version requirement
        REQUIRED_VERSION=$(grep '"electron"' package.json | sed -E 's/.*"([0-9]+)\..*/\1/')
        ELECTRON_PATH=$(find /nix/store -maxdepth 1 -name "*electron-${REQUIRED_VERSION}*" -type d 2>/dev/null | grep -v unwrapped | head -1)
        
        if [ -n "$ELECTRON_PATH" ] && [ -d "$ELECTRON_PATH/bin" ]; then
            export ELECTRON_OVERRIDE_DIST_PATH="$ELECTRON_PATH/bin"
            echo "NixOS detected: Using electron from $ELECTRON_PATH/bin"
        fi
    fi
fi

# Run electron-forge directly to avoid recursion
exec npx electron-forge start "$@"
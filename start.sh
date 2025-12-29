#!/usr/bin/env bash

# Check if we're on NixOS and set up electron path if needed
if [ -f /etc/NIXOS ] || [ -n "$NIX_STORE" ]; then
    # We're on NixOS, need to find the electron path
    # Try to find electron in nix store matching our version requirement
    REQUIRED_VERSION=$(grep '"electron"' package.json | sed -E 's/.*"electron"[[:space:]]*:[[:space:]]*"([0-9]+)\..*/\1/')
    
    # Search for electron in nix store
    ELECTRON_PATH=$(ls -d /nix/store/*electron-${REQUIRED_VERSION}* 2>/dev/null | grep -v -E '(unwrapped|\.drv$)' | head -1)
    
    if [ -n "$ELECTRON_PATH" ] && [ -d "$ELECTRON_PATH/bin" ]; then
        export ELECTRON_OVERRIDE_DIST_PATH="$ELECTRON_PATH/bin"
        echo "NixOS detected: Using electron from $ELECTRON_PATH/bin"
    else
        echo "Warning: Could not find electron ${REQUIRED_VERSION} in nix store"
    fi
fi

# Run electron-forge directly to avoid recursion
exec npx electron-forge start "$@"
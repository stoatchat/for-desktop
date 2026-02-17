{ pkgs ? import (fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/77ef7a29d276c6d8303aece3444d61118ef71ac2.tar.gz";
    sha256 = "0pm4l48jq8plzrrrisimahxqlcpx7qqq9c99hylmf7p3zlc3phsy";
  }) {},
}:

pkgs.mkShell rec {
  buildInputs = with pkgs; [
    # Tools
    pkgs.mise

    # Electron
    (pkgs.writeShellScriptBin "electron-nix" ''
      exec ${pkgs.electron}/bin/electron "$@"
    '')

    # build target: zip
    pkgs.zip

    # build target: deb
    pkgs.dpkg
    pkgs.fakeroot

    # build target: flatpak
    pkgs.flatpak
    pkgs.flatpak-builder
    pkgs.elfutils
    # flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
    
    (writeShellScriptBin "fish" ''
      exec ${pkgs.fish}/bin/fish -C 'mise activate fish | source' "$@"
    '')
  ];

  shellHook = ''
    export ELECTRON_OVERRIDE_DIST_PATH="${pkgs.electron}/bin"
    export MISE_NODE_COMPILE=false
    eval "$(mise activate bash)"
  '';
}

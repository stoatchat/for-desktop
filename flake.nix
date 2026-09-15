{
  description = "Stoat for Desktop Development shell";

  inputs = {
    nixpkgs.url = "https://channels.nixos.org/nixpkgs-unstable/nixexprs.tar.zst";
  };

  outputs = inputs: {
    devShells = builtins.mapAttrs (system: pkgs: {
      default = pkgs.mkShell {
        buildInputs = with pkgs; [
          mise
          pnpm
          (writeShellScriptBin "electron-nix" ''
            exec ${pkgs.lib.getExe pkgs.electron} "$@"
          '')
          zip
          flatpak
          flatpak-builder
          elfutils
        ];

        shellHook = ''
          export ELECTRON_OVERRIDE_DIST_PATH="${pkgs.electron}/bin"
          export MISE_NODE_COMPILE=false
        '';
      };
    }) inputs.nixpkgs.legacyPackages;
  };
}

{
  description = "Development environment for Stoat desktop app";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }@inputs:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forEachSystem = nixpkgs.lib.genAttrs supportedSystems;
    in
    {
      devShells = forEachSystem (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              mise
              pnpm
              python3
              electron
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
        }
      );
    };
}

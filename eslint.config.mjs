import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      // build artifacts
      "**/coverage/**",
      "**/dist/**",
      "**/out/**",
      "**/.vite/**",
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.electron,
  importPlugin.flatConfigs.typescript,
  prettier,
  {
    rules: {
      "import/no-unresolved": [
        "error",
        {
          // vite asset imports; ESM-only packages the require-based node
          // resolver cannot resolve (only imported from eslint.config.mjs)
          ignore: ["^.*\\?asset$", "^typescript-eslint$", "^eslint/config$"],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          caughtErrors: "all",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],
      "prettier/prettier": ["warn"],
    },
  },
]);

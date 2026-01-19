import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      js,
      prettier: prettierPlugin,
    },
    extends: [
      js.configs.recommended,
      prettierConfig, // disables conflicting ESLint rules
    ],
    rules: {
      "prettier/prettier": "error",
    },
  },

  // TypeScript-specific rules
  ...tseslint.configs.recommended,
]);

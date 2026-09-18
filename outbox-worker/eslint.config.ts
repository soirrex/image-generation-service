import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-console": "warn",
      eqeqeq: "warn",
    },
    languageOptions: { globals: globals.node },
  },
  tseslint.configs.recommended,
]);

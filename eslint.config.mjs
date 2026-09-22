import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    ignores: ["*.mjs", "main.js", "node_modules/**"],
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      // Preserve brand names with their canonical casing in UI strings.
      "obsidianmd/ui/sentence-case": ["error", {
        brands: ["StoryLine", "Scrivener", "Obsidian"],
      }],
      // StoryLine supports both settings APIs: getSettingDefinitions() is used
      // by Obsidian 1.13+, while display() remains the 1.12.x fallback.
      //
      // The plugin's recommended config forbids inline-disabling ANY
      // obsidianmd/* rule (via eslint-comments/no-restricted-disable with
      // the "obsidianmd/*" wildcard), so the suppression must live here.
      "obsidianmd/settings-tab/prefer-setting-definitions": "off",
    },
  },
]);

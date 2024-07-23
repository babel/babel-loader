import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import babelParser from "@babel/eslint-parser";
import js from "@eslint/js";

export default [
  {
    ignores: [
      "**/lib",
      "**/node_modules",
      "**/scripts",
      "test/output",
      "test/fixtures",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
      parser: babelParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  eslintPluginPrettierRecommended,
];

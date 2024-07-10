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

    rules: {
      camelcase: "off",
      "consistent-return": "off",
      curly: ["error", "multi-line"],
      "linebreak-style": ["error", "unix"],
      "max-len": ["error", 110, 2],
      "new-cap": "off",
      "no-cond-assign": "off",
      "no-confusing-arrow": "error",
      "no-console": "off",
      "no-constant-condition": "off",
      "no-empty": "off",
      "no-fallthrough": "off",
      "no-inner-declarations": "off",
      "no-labels": "off",
      "no-loop-func": "off",
      "no-process-exit": "off",
      "no-return-assign": "off",
      "no-shadow": "off",
      "no-underscore-dangle": "off",
      "no-unreachable": "off",
      "no-use-before-define": "off",
      strict: "off",
    },
  },
  eslintPluginPrettierRecommended,
];

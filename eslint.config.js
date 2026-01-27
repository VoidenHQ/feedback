import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigRules } from "@eslint/compat";
import eslintConfigPrettier from "eslint-config-prettier";

const reactPlugin = {
  ...pluginReactConfig,
  rules: {
    ...pluginReactConfig.rules,
    "react/react-in-jsx-scope": 0,
    "react/jsx-uses-react": 0,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};

export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...fixupConfigRules({
    ...reactPlugin,
  }),
  eslintConfigPrettier,
  {
    rules: {
      // Warn on console usage (except console.error)
      // Encourages use of logger utility instead
      "no-console": ["warn", { allow: ["error"] }],
    },
  },
];

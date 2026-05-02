import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "next-env.d.ts",
      "src/types/database.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Browser
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        history: "readonly",
        location: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
        FormData: "readonly",
        HTMLElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLLabelElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLParagraphElement: "readonly",
        HTMLSpanElement: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        Node: "readonly",
        Response: "readonly",
        Request: "readonly",
        // Node
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        // React (no-undef)
        React: "readonly",
      },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-undef": "off", // TS handles this
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-constant-condition": ["error", { checkLoops: false }],
    },
  },
];

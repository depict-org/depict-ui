module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint",
    "unused-imports", // auto-fixes unused imports
  ],

  rules: {
    // These are normally considered errors, but for now we change to warn,
    // so that eslint benefit can be incrementally increased over time rather
    // than be a disruptive threshold and pain.
    //
    // Change from 'warn' to 'off' for the ones that the team disagrees with
    // entirely to prevent the `npm run lint:fix` command from fixing them
    // unintentionally.
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/ban-types": "warn",
    "@typescript-eslint/no-array-constructor": "warn",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-extra-semi": "warn",
    "@typescript-eslint/no-inferrable-types": "warn",
    "@typescript-eslint/no-this-alias": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-var-requires": "warn",
    "@typescript-eslint/no-empty-interface": "warn",
    "@typescript-eslint/no-non-null-assertion": "off",
    "max-len": ["warn", { code: 300 }],
    "no-cond-assign": "warn",
    "no-constant-condition": "warn",
    "no-debugger": "warn",
    "no-empty": "warn",
    "no-extra-boolean-cast": "warn",
    "no-global-assign": "warn",
    "no-inner-declarations": "warn",
    "no-irregular-whitespace": "warn",
    "no-mixed-spaces-and-tabs": "warn",
    "no-prototype-builtins": "warn",
    "no-undef": "warn",
    "no-unexpected-multiline": "warn",
    "no-unreachable": "warn",
    "no-unsafe-finally": "warn",
    "no-useless-escape": "warn",
    "no-var": "warn",
    "prefer-const": "warn",
    "prefer-rest-params": "warn",
    "no-sparse-arrays": "off",
    "@typescript-eslint/no-unsafe-declaration-merging": "warn",
    "@typescript-eslint/triple-slash-reference": "off", // we need these, see https://github.com/parcel-bundler/parcel/issues/8642#issuecomment-1319999055
  },

  // Rules specifically for integration code (src and lib)
  overrides: [
    {
      "files": ["src/**/*", "lib/**/*"],
      "rules": {
        "no-console": "error",
      },
    },
    {
      "files": ["*.ts", "*.tsx"],
      "rules": {
        "no-undef": "off",
      },
    },
  ],
  globals: {
    process: true,
  },
};

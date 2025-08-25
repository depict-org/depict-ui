let extraPlugins = process.env.BUILD_TARGET === "ie11" ? ["@parcel/babel-plugin-transform-runtime"] : [];
const hydratable = process.env.HYDRATABLE === "true";
const is_server = process.env.SERVER === "true";

const exported = (module.exports = {
  "presets": [
    "@babel/preset-typescript",
    "@parcel/babel-preset-env",
    ["solid", { hydratable, generate: is_server ? "ssr" : "dom" }],
  ],
  "plugins": [
    [
      "@babel/plugin-transform-runtime",
      {
        "corejs": false,
      },
    ],
    ...extraPlugins,
    ...(process.env.NO_PRIVATE_TRANSPILATION === "true"
      ? []
      : [
          ["@babel/plugin-proposal-private-methods", { "loose": true }],
          ["@babel/plugin-proposal-class-properties", { "loose": true }],
          ["@babel/plugin-transform-private-property-in-object", { "loose": true }],
        ]),
  ],
});

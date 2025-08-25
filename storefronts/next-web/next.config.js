/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // setting this to true breaks scroll restoration because it will call reset_history_state when react strict mode does its first render pass which it then discards
  swcMinify: true,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/se",
        permanent: false,
      },
    ];
  },
  output: "standalone",
  // staticPageGenerationTimeout: 2147483,
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Note: we provide webpack above so you should not `require` it
    // Perform customizations to webpack config
    // Important: return the modified config

    // Disable minification since it breaks the app for some very hard to debuggable reason

    if (!dev) {
        config.optimization.minimize = false;
    }

    return config;
},
};

module.exports = nextConfig;

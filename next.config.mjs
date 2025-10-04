import pwaRuntimeConfig from "./lib/pwa-runtime.mjs";

let withPWAInit;

try {
  ({ default: withPWAInit } = await import("next-pwa"));
} catch (error) {
  const shouldThrow =
    process.env.NODE_ENV === "production" &&
    process.env.SKIP_PWA_PLUGIN !== "1";

  if (shouldThrow) {
    throw error;
  }

  console.warn(
    "next-pwa is unavailable; continuing without PWA enhancements in",
    `${process.env.NODE_ENV} mode.`,
  );

  withPWAInit = () => (config) => config;
}

const withPWA = withPWAInit({
  dest: "public",
  register: false,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  ...pwaRuntimeConfig,
  buildExcludes: [/_next\/server\/pages\/_middleware.js$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default withPWA(nextConfig);

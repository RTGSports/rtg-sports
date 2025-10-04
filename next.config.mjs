import withPWAInit from "next-pwa";
import pwaRuntimeConfig from "./lib/pwa-runtime.mjs";

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

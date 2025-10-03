import withPWAInit from "next-pwa";
import runtimeCaching from "./lib/pwa-runtime.mjs";

const withPWA = withPWAInit({
  dest: "public",
  register: false,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching,
  buildExcludes: [/_next\/server\/pages\/_middleware.js$/],
  fallbacks: {
    document: "/offline",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default withPWA(nextConfig);

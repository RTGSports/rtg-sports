/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/:path*", destination: "https://rtg-api.alextripp1.workers.dev/:path*" }]
      : [];
  },
  experimental: { typedRoutes: true },
  output: "export"
};
export default nextConfig;
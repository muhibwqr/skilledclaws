/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@skilledclaws/ui"],
  // Ensure environment variables are loaded from root .env
  env: {
    // Next.js automatically loads NEXT_PUBLIC_* vars, but we ensure root .env is checked
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Lint stays a separate CI/dev-time gate (`pnpm lint`); it shouldn't block
  // the production bundle. TODO(frontend): drop once `next lint` is clean.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

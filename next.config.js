/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // The `images.unoptimized = true` option is required for Static Exports
  images: { 
    unoptimized: true 
  },
  // Set the base path to match your GitHub repository name
  basePath: '/youtube-downloader',
  // Turn off server-side API routes for static export
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig; 
/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false, // Disable SWC minifier to fix HeartbeatWorker.js Terser error
  transpilePackages: ['lucide-react'],
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    if (!Array.isArray(config.externals)) {
      config.externals = [];
    }
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    config.module.rules.unshift({
      test: /\.(js|mjs)$/,
      include: /node_modules\/(wagmi|viem|connectkit)/,
      type: 'javascript/auto',
    });

    return config;
  },
};

export default nextConfig;

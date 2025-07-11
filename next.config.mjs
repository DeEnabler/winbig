/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // Initialize externals if not present, and ensure it's an array
    if (!Array.isArray(config.externals)) {
      config.externals = [];
    }
    // Add server-side only packages to externals
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    // Add packages that need to be treated as commonjs modules
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    // Add rule for .mjs files in node_modules
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });
    return config;
  },
};

export default nextConfig;

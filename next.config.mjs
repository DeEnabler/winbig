
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
    config.module.rules.push({
      test: /\.worker\.js$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/chunks/[name].[hash].js',
      },
    });
    return config;
  },
};

export default nextConfig;

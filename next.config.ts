
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false, // Ensures TypeScript errors are not ignored
  },
  eslint: {
    ignoreDuringBuilds: false, // Ensures ESLint errors are not ignored during builds
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
  experimental: {
    allowedDevOrigins: [
      "https://9000-firebase-studio-1748227192070.cluster-3gc7bglotjgwuxlqpiut7yyqt4.cloudworkstations.dev",
    ],
  },
};

export default nextConfig;

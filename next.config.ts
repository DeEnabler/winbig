
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
        'https://6000-firebase-studio-1748227192070.cluster-3gc7bglotjgwuxlqpiut7yyqt4.cloudworkstations.dev',
        'https://9000-firebase-studio-1748227192070.cluster-3gc7bglotjgwuxlqpiut7yyqt4.cloudworkstations.dev',
    ],
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

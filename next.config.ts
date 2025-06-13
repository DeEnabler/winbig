
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
        // It's sometimes useful to also add the http version if issues persist, or if the exact protocol isn't clear.
        // 'http://6000-firebase-studio-1748227192070.cluster-3gc7bglotjgwuxlqpiut7yyqt4.cloudworkstations.dev'
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

import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@darun/ui', '@darun/ui-layout'],
  experimental: {
    ...(process.env.ENABLE_EXPERIMENTAL_REACT_COMPILER === 'true'
      ? {
          reactCompiler: true,
        }
      : {}),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
      },
    ],
  },
  redirects: () => [
    {
      source: '/',
      destination: '/products',
      permanent: false,
    },
  ],
  webpack: (config, { isServer }) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias['@croco/utils-structure-react'] = fileURLToPath(
      new URL('./app/shims/utils-structure-react.js', import.meta.url),
    );

    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'vitest',
        'jsdom',
        '@vitest/runner',
        '@vitest/utils',
      ];
    }
    return config;
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  transpilePackages: ['@darun/ui', '@darun/ui-layout', '@darun/utils-structure-react'],
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

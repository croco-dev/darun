/* eslint-disable @typescript-eslint/no-var-requires */
const { withKumaUI } = require('@kuma-ui/next-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {},
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
  experimental: {
    swcPlugins: [
      [
        'graphql-tag-swc-plugin',
        {
          importSources: ['@apollo/client'],
          gqlTagIdentifiers: ['gql'],
        },
      ],
    ],
  },
};

module.exports = withKumaUI(nextConfig);

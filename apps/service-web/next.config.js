/* eslint-disable @typescript-eslint/no-var-requires */
const { withKumaUI } = require('@kuma-ui/next-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {},
  images: {
    domains: ['res.cloudinary.com'],
  },
};

module.exports = withKumaUI(nextConfig);

/* eslint-disable @typescript-eslint/no-var-requires */
const { withKumaUI } = require('@kuma-ui/next-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {},
};

module.exports = withKumaUI(nextConfig);

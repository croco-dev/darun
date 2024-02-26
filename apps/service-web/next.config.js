/* eslint-disable @typescript-eslint/no-var-requires */
const { withKumaUI } = require('@kuma-ui/next-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {},
  images: {
    domains: [
      'res.cloudinary.com',
      'via.placeholder.com', // TODO(@ddarkr): 개발 목적의 이미지 도메인 등록
    ],
  },
};

module.exports = withKumaUI(nextConfig);

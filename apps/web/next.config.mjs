/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const config = {
  reactStrictMode: true,
  // Dev and prod builds use separate output dirs. Sharing `.next` between
  // `next dev` and `next build` produces:
  //   "Cannot find module './244.js'" in webpack-runtime.js
  // because the prod webpack runtime rewrites chunks the dev server holds open.
  distDir: isDev ? '.next-dev' : '.next',
  transpilePackages: [
    '@segen/auth',
    '@segen/design-system',
    '@segen/types',
    '@segen/api-client',
    '@segen/analytics',
  ],
  experimental: { optimizePackageImports: ['@segen/design-system'] },
};

export default config;

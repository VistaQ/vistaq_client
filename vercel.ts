import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  regions: ['sin1'],
  rewrites: [
    { source: '/api/:path*', destination: `${process.env.BACKEND_URL}/api/:path*` },
    { source: '/(.*)', destination: '/index.html' },
  ],
};

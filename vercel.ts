import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  regions: ['sin1'],
  rewrites: [
    routes.rewrite('/api/(.*)', `${process.env.BACKEND_URL}/api/$1`),
    routes.rewrite('/(.*)', '/index.html'),
  ],
};

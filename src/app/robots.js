export default function robots() {
  return {
    rules: [
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'Bytespider', 'CCBot'],
        disallow: ['/'],
      },
      {
        userAgent: ['Googlebot', 'Bingbot', 'ChatGPT-User', '*'],
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
          '/checkout',
          '/login',
          '/verify/',
        ],
      }
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sitemap.xml`,
  };
}

export default function robots() {
  return {
    rules: [
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Bytespider', 'CCBot'],
        disallow: ['/'],
      },
      {
        userAgent: ['ChatGPT-User', 'Googlebot', 'Bingbot', '*'],
        allow: '/',
        disallow: ['/dashboard/', '/admin/', '/api/'],
      }
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sitemap.xml`,
  };
}

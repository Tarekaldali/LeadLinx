export default function robots() {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadlinx.vercel.app';
  if (!baseUrl.includes('localhost')) {
    baseUrl = baseUrl.replace('http://', 'https://').replace('https://www.', 'https://');
  }

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
          '/api/',
          '/verify/',
        ],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'LeadLinx — AI-Powered Reddit Lead Generation Platform',
    template: '%s',
  },
  description: 'Use free Reddit tools to check buyer intent, generate search ideas, score posts, draft safer replies, and plan when to move into Leadline V3.',
  keywords: ['reddit lead generation', 'AI lead scoring', 'social selling', 'reddit prospecting', 'B2B leads', 'buying intent'],
  authors: [{ name: 'LeadLinx Intelligence' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'LeadLinx',
    title: 'LeadLinx — AI-Powered Reddit Lead Generation',
    description: 'Use free Reddit tools to check buyer intent, generate search ideas, score posts, draft safer replies, and plan when to move into Leadline V3.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LeadLinx — AI-Powered Reddit Lead Generation',
    description: 'Use free Reddit tools to check buyer intent, generate search ideas, score posts, draft safer replies, and plan when to move into Leadline V3.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

import GoogleProviderWrapper from '@/components/GoogleProviderWrapper';
import ThemeProvider from '@/components/ThemeProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'LeadLinx',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                description: 'Use free Reddit tools to check buyer intent, generate search ideas, score posts, draft safer replies, and plan when to move into Leadline V3.',
                url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                offers: {
                  '@type': 'AggregateOffer',
                  lowPrice: '0',
                  highPrice: '49',
                  priceCurrency: 'USD',
                },
              },
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'LeadLinx Intelligence',
                url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                logo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/logo-new.png`,
                sameAs: [
                  'https://twitter.com/leadlinx',
                  'https://linkedin.com/company/leadlinx'
                ]
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'LeadLinx',
                url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                potentialAction: {
                  '@type': 'SearchAction',
                  target: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/find-leads/{search_term_string}`,
                  'query-input': 'required name=search_term_string'
                }
              }
            ]),
          }}
        />
        <script src="https://analytics.ahrefs.com/analytics.js" data-key="OaaaQsUz5I6zk4nE8r472g" async></script>
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <GoogleProviderWrapper>
            {children}
          </GoogleProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}

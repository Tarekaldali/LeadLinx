import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'LeadLinx — AI-Powered Reddit Lead Generation Platform',
    template: '%s | LeadLinx',
  },
  description: 'Transform Reddit conversations into high-converting leads. Our AI scans millions of posts in real-time to find users with buying intent.',
  keywords: ['reddit lead generation', 'AI lead scoring', 'social selling', 'reddit prospecting', 'B2B leads', 'buying intent'],
  authors: [{ name: 'LeadLinx Intelligence' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'LeadLinx',
    title: 'LeadLinx — AI-Powered Reddit Lead Generation',
    description: 'Transform Reddit conversations into high-converting leads with AI-powered intent detection.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LeadLinx — AI-Powered Reddit Lead Generation',
    description: 'Transform Reddit conversations into high-converting leads with AI-powered intent detection.',
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'LeadLinx',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: 'AI-powered Reddit lead generation platform that detects buying intent in real-time.',
              offers: {
                '@type': 'AggregateOffer',
                lowPrice: '0',
                highPrice: '7.99',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
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

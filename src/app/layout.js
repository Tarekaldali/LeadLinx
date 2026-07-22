import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'LeadLinx — AI-Powered Reddit Lead Generation',
    template: '%s | LeadLinx',
  },
  description: 'LeadLinx is the leading AI-powered Reddit lead generation software. Automate your social selling by extracting high-intent leads from Reddit directly into your CRM.',
  keywords: ['LeadLinx', 'reddit lead generation', 'b2b leads', 'social selling', 'intent scoring', 'sales automation', 'Lead Linx'],
  authors: [{ name: 'LeadLinx Intelligence' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'LeadLinx',
    title: 'LeadLinx — AI-Powered Reddit Lead Generation',
    description: 'LeadLinx is the leading AI-powered Reddit lead generation software. Automate your social selling by extracting high-intent leads from Reddit directly into your CRM.',
    images: [
      {
        url: '/logo.png', // Fallback og:image
        width: 800,
        height: 600,
        alt: 'LeadLinx Logo',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LeadLinx — AI-Powered Reddit Lead Generation',
    description: 'LeadLinx is the leading AI-powered Reddit lead generation software. Automate your social selling by extracting high-intent leads from Reddit directly into your CRM.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { Inter, JetBrains_Mono, Hanken_Grotesk } from 'next/font/google';
import Script from 'next/script';
import GoogleProviderWrapper from '@/components/GoogleProviderWrapper';
import ThemeProvider from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-jetbrains' });
const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--font-hanken' });

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetBrainsMono.variable} ${hankenGrotesk.variable}`}>
      <head>
        <link rel="icon" href="/logo.png" />
        {/* Material Symbols Outlined is still external as it's an icon font, but we defer it if possible or keep it if critical */}
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
                description: 'LeadLinx is an AI-powered Reddit lead generation platform. It automatically extracts high-intent prospects and syncs them to your CRM.',
                url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                offers: {
                  '@type': 'AggregateOffer',
                  lowPrice: '0',
                  highPrice: '19.99',
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
      </head>
      <body className="antialiased">
        <Script src="https://analytics.ahrefs.com/analytics.js" data-key="OaaaQsUz5I6zk4nE8r472g" strategy="afterInteractive" />
        <ThemeProvider>
          <GoogleProviderWrapper>
            {children}
          </GoogleProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}

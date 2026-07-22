import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import HeroCTA from '@/components/HeroCTA';
import NavAuth from '@/components/NavAuth';

export const metadata = {
  title: 'LeadLinx | The #1 AI Reddit Lead Generation Software',
  description: 'Maximize your social selling with LeadLinx. Our proprietary AI monitors thousands of subreddits to extract high-intent Reddit leads and deliver them straight to your CRM.',
  alternates: { canonical: '/' }
};

export const revalidate = 3600;

export default async function LandingPage() {
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://leadlinx.vercel.app/#organization",
        "name": "LeadLinx",
        "url": "https://leadlinx.vercel.app",
        "logo": {
          "@type": "ImageObject",
          "url": "https://leadlinx.vercel.app/logo.png"
        },
        "description": "AI-powered precision Reddit lead generation platform.",
        "sameAs": []
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://leadlinx.vercel.app/#software",
        "name": "LeadLinx Platform",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "description": "Automated pipeline tool using AI to identify buying intent on Reddit."
      }
    ]
  };

  return (
    <div className="bg-surface dark:bg-surface-dark text-on-surface font-body-md min-h-screen flex flex-col pt-[72px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 mx-auto transition-transform duration-200">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold">
              <span className="text-primary">Lead</span>
              <span className="text-black dark:text-white">Linx</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6 font-body-md text-body-md">
            <Link href="/pricing" className="text-on-surface-variant hover:text-primary transition-colors duration-200">Pricing</Link>
            <Link href="/blog" className="text-on-surface-variant hover:text-primary transition-colors duration-200">Blog</Link>
            <Link href="/contact" className="text-on-surface-variant hover:text-primary transition-colors duration-200">Need Help?</Link>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <NavAuth />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-20 md:py-32 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-8 text-center md:text-left z-10 animate-fade-in">
          <h1 className="font-display-xl text-display-xl text-on-surface">
            Extract High-Intent Reddit Leads with <span className="text-primary">LeadLinx</span>
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto md:mx-0">
            Stop scrolling manually. The LeadLinx AI monitors thousands of subreddits in real-time to automatically discover, score, and deliver high-converting Reddit prospects straight to your CRM.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start">
            <HeroCTA />
            <Link href="/blog" className="bg-transparent border border-outline text-on-surface font-button text-button px-6 py-3 rounded flex items-center justify-center gap-2 hover:bg-surface-variant transition-colors">Learn More</Link>
          </div>
        </div>
        <div className="flex-1 relative w-full aspect-[4/3] rounded-xl border border-white/10 bg-[#0A2540]/40 overflow-hidden glow-effect animate-scale-in">
          <Image 
            src="/landing-page-image.png" 
            alt="LeadLinx Dashboard Interface"
            fill
            priority
            className="object-cover w-full h-full opacity-80"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </section>

      {/* Value Proposition */}
      <section className="bg-surface-container-lowest py-24 border-y border-white/5">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop space-y-16">
          <div className="text-center space-y-4">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Why Choose LeadLinx?</h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">Discover how the LeadLinx intelligence engine automates your Reddit lead generation pipeline.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Feature 1 */}
            <div className="bg-surface/50 border border-white/10 p-8 rounded-lg hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded bg-primary-container/20 flex items-center justify-center mb-6 text-primary">
                <span className="material-symbols-outlined">radar</span>
              </div>
              <h3 className="font-button text-button text-on-surface mb-2">Omni-Channel Discovery</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Continuous AI scanning across Reddit and social platforms to detect buying intent signals instantly.</p>
            </div>
            {/* Feature 2 */}
            <div className="bg-surface/50 border border-white/10 p-8 rounded-lg hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded bg-primary-container/20 flex items-center justify-center mb-6 text-primary border-l-2 border-secondary-fixed">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <h3 className="font-button text-button text-on-surface mb-2">Automated Qualification</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Proprietary AI scoring models analyze context, urgency, and fit to rank leads automatically.</p>
            </div>
            {/* Feature 3 */}
            <div className="bg-surface/50 border border-white/10 p-8 rounded-lg hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded bg-primary-container/20 flex items-center justify-center mb-6 text-primary">
                <span className="material-symbols-outlined">sync</span>
              </div>
              <h3 className="font-button text-button text-on-surface mb-2">CRM Sync</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Seamless one-click export to Salesforce, HubSpot, and other leading CRMs to close the loop.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

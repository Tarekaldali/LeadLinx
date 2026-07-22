import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const revalidate = 86400;

export const metadata = {
  title: 'Privacy Policy',
  description: 'Read the Privacy Policy for LeadLinx. Learn how we collect, use, and protect your personal data and platform usage metrics.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    type: 'website',
    url: '/privacy',
    title: 'Privacy Policy',
    description: 'Read the Privacy Policy for LeadLinx. Learn how we collect, use, and protect your personal data and platform usage metrics.',
  }
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <Navbar activePage="privacy" />
      
      <main className="flex-1 pb-24">
        <div className="max-w-4xl mx-auto px-6 mt-24">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight animate-fade-in">
              Privacy <span className="text-primary">Policy</span>
            </h1>
            <p className="text-on-surface-variant max-w-2xl mx-auto font-body animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Last updated: June 2026
            </p>
          </div>

          <div className="bento-card p-8 md:p-12 space-y-8 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">1. Information We Collect</h2>
              <p className="text-on-surface-variant leading-relaxed">
                When you use LeadLinx, we collect Personally Identifiable Information (PII) that you provide directly to us, such as your name, email address, and company details when registering for an account. We also collect aggregated usage data, including log files, device information, IP addresses, and interaction metrics to improve our services, analyze trends, and debug platform issues. We use cookies and similar tracking technologies to track activity on our service and hold certain information, ensuring a seamless user experience.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">2. How We Use Your Data</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We use the collected data for various purposes, including but not limited to: providing and maintaining our service, notifying you about changes to our platform, providing customer support, gathering analysis or valuable information so that we can improve the platform, and monitoring the usage of our AI extraction tools. We may also use your information to contact you with newsletters, marketing or promotional materials, and other information that may be of interest to you.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">3. Payment Processing & PCI-DSS Compliance</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We do not store, process, or transmit your raw credit card information on our servers. All transactions are securely processed by Tap Payments, a certified Level 1 PCI-DSS compliant payment gateway. Tap Payments acts as our secure processor, handling the entire transaction flow. We only store anonymized transaction references and payment tokens necessary to manage your subscription, issue refunds, and track account billing status.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">4. Data Security & Retention</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We implement robust, industry-standard security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your data is encrypted in transit using TLS/SSL protocols and encrypted at rest in our secured databases. We retain your data only for as long as your account is active or as needed to provide you services, comply with our legal obligations, resolve disputes, and enforce our agreements. If you request account deletion, we will purge your personal data within 30 days.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">5. Third-Party Data Processors</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We do not sell your personal data to advertisers. We only share information with trusted third-party data processors under strict confidentiality agreements. These processors include cloud hosting providers, analytics platforms (such as Ahrefs and Google Analytics), customer support software, and email delivery services. All our third-party vendors are vetted for security compliance to ensure your data remains protected.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">6. AI Processing & Content Extraction</h2>
              <p className="text-on-surface-variant leading-relaxed">
                LeadLinx uses artificial intelligence, specifically advanced Large Language Models, to analyze public Reddit content. While we analyze public posts and comments to score leads, we do not feed your proprietary search queries or account data into public model training sets. The analysis is performed securely via API, and the resulting insights are generated exclusively for your account's use.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">7. User Data Rights (GDPR / CCPA)</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We respect your data privacy rights globally, offering baseline protections aligned with GDPR (Europe) and CCPA (California) standards. You have the right to access the personal data we hold about you, request corrections to inaccurate data, object to our processing of your data, or request complete deletion of your personal information. You can manage your account data from your dashboard or contact our privacy team directly at privacy@leadlinx.app to exercise any of these rights.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">8. Children's Privacy</h2>
              <p className="text-on-surface-variant leading-relaxed">
                Our Service does not address anyone under the age of 18 ("Children"). We do not knowingly collect personally identifiable information from anyone under the age of 18. If you are a parent or guardian and you are aware that your child has provided us with Personal Data, please contact us. If we become aware that we have collected Personal Data from children without verification of parental consent, we take steps to remove that information from our servers.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">9. Changes to This Privacy Policy</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </section>
            <section className="mt-16 bento-card p-8 text-center space-y-4">
              <h2 className="font-headline text-xl text-on-surface">Ready to try LeadLinx?</h2>
              <p className="text-on-surface-variant text-sm max-w-lg mx-auto">
                We are committed to protecting your privacy. Start generating leads on Reddit with confidence.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/login" className="btn-primary inline-flex items-center gap-2">
                  Start Free Trial
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
                <Link href="/terms" className="text-sm text-primary hover:underline">
                  Read our Terms of Service →
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

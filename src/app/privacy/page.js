import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy | LeadLinx',
  description: 'Read the Privacy Policy for LeadLinx.',
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
                When you use LeadLinx, we collect Personally Identifiable Information (PII) that you provide directly to us, such as your name and email address. We also collect aggregated usage data to improve our services and debug issues.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">2. Payment Processing & PCI-DSS Compliance</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We do not store, process, or transmit your raw credit card information on our servers. All transactions are securely processed by Tap Payments. Tap Payments acts as our secure processor and complies with strict PCI-DSS standards. We only store anonymized transaction references and payment tokens necessary to manage your subscription.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">3. Data Security & Retention</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We implement robust security measures to protect your personal information. Your data is encrypted in transit and at rest. We retain your data only for as long as your account is active or as needed to provide you services, comply with our legal obligations, resolve disputes, and enforce our agreements.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">4. Third-Party Data Processors</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We do not sell your personal data. We only share information with trusted third-party data processors (such as Tap Payments for billing, and secure cloud providers for hosting) under strict confidentiality agreements necessary to operate our platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">5. User Data Rights (GDPR / CCPA)</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We respect your data privacy rights, offering baseline protections aligned with GDPR and CCPA standards. You have the right to access, correct, update, or request deletion of your personal information. You can manage your account data from your dashboard or contact our support team directly to request complete data erasure.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

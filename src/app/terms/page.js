import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Terms and Conditions | LeadLinx',
  description: 'Read the Terms and Conditions and Refund & Cancellation Policy for LeadLinx.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <Navbar activePage="terms" />
      
      <main className="flex-1 pb-24">
        <div className="max-w-4xl mx-auto px-6 mt-24">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight animate-fade-in">
              Terms and <span className="text-primary">Conditions</span>
            </h1>
            <p className="text-on-surface-variant max-w-2xl mx-auto font-body animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Last updated: June 2026
            </p>
          </div>

          <div className="bento-card p-8 md:p-12 space-y-8 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">1. Introduction</h2>
              <p className="text-on-surface-variant leading-relaxed">
                Welcome to LeadLinx. By accessing or using our website, you agree to be bound by these Terms and Conditions. Please read them carefully. If you do not agree with any part of these terms, you must not use our service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">2. Use of Service</h2>
              <p className="text-on-surface-variant leading-relaxed">
                LeadLinx provides AI-powered lead generation services. You agree to use the service only for lawful purposes and in a way that does not infringe the rights of, restrict, or inhibit anyone else&apos;s use of the website.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">3. User Accounts & Account Suspension</h2>
              <p className="text-on-surface-variant leading-relaxed">
                To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials. We reserve the right to suspend or terminate accounts that violate our terms, engage in abusive usage of our APIs, or perform fraudulent activity. Account suspension may occur without prior notice and will result in the forfeiture of any remaining credits.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-primary">4. Billing, Payments & Subscription Lifecycle</h2>
              <div className="bg-surface-dim/50 p-6 rounded-xl border border-border-glass mt-4">
                <h3 className="text-lg font-bold mb-2">Recurring Billing via Tap Payments</h3>
                <p className="text-on-surface-variant leading-relaxed mb-4">
                  All subscription plans are billed on a recurring basis. By providing your payment method, you authorize us to charge your subscription fees through our official payment gateway, Tap Payments. We do not store your credit card details on our servers; all sensitive payment data is securely handled by Tap Payments.
                </p>

                <h3 className="text-lg font-bold mb-2">Non-Refundable Digital Goods (Credits)</h3>
                <p className="text-on-surface-variant leading-relaxed mb-4">
                  Due to the nature of digital goods and AI processing costs, allocated credits are strictly non-refundable once consumed. If you cancel your subscription, you will retain access to your remaining credits until the end of your current billing cycle. Subscription renewals are also non-refundable.
                </p>

                <h3 className="text-lg font-bold mb-2">Chargeback & Dispute Policy</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  In the event of an unjustified chargeback or payment dispute, your account will be immediately suspended pending investigation. We request that you contact our support team to resolve billing issues before initiating disputes with your financial institution.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">5. Limitation of Liability</h2>
              <p className="text-on-surface-variant leading-relaxed">
                LeadLinx provides AI-generated leads based on automated extraction and classification. We do not guarantee the absolute accuracy, completeness, or conversion rates of the leads provided. You acknowledge that AI systems may occasionally produce inaccurate results, and LeadLinx shall not be held liable for any direct or indirect business losses arising from the use of or reliance on our lead generation data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">6. Intellectual Property</h2>
              <p className="text-on-surface-variant leading-relaxed">
                The content, layout, design, data, databases, and graphics on this website are protected by intellectual property laws and are owned by LeadLinx. You may not reproduce, download, or otherwise use any of our intellectual property without express written consent.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">7. Changes to Terms</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of any significant changes. Your continued use of the service after such modifications constitutes acceptance of the updated terms.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

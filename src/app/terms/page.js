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
              Last updated: October 2024
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
              <h2 className="text-2xl font-bold text-on-surface">3. User Accounts</h2>
              <p className="text-on-surface-variant leading-relaxed">
                To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-primary">4. Refund & Cancellation Policy</h2>
              <div className="bg-surface-dim/50 p-6 rounded-xl border border-border-glass mt-4">
                <h3 className="text-lg font-bold mb-2">Cancellations</h3>
                <p className="text-on-surface-variant leading-relaxed mb-4">
                  You may cancel your subscription at any time through your dashboard settings. Cancellations take effect at the end of the current billing cycle, allowing you to use your remaining credits until then.
                </p>
                
                <h3 className="text-lg font-bold mb-2">Refunds</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  We offer a 7-day money-back guarantee for initial purchases if you are unsatisfied with the service and have used less than 10% of your allocated credits. Subscription renewals are non-refundable. To request a refund, please use our Contact Us page.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">5. Intellectual Property</h2>
              <p className="text-on-surface-variant leading-relaxed">
                The content, layout, design, data, databases, and graphics on this website are protected by intellectual property laws and are owned by LeadLinx. You may not reproduce, download, or otherwise use any of our intellectual property without express written consent.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">6. Limitation of Liability</h2>
              <p className="text-on-surface-variant leading-relaxed">
                LeadLinx shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the service.
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

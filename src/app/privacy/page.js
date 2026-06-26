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
                When you use LeadLinx, we collect information that you provide directly to us, such as your name, email address, and payment information when you subscribe to our plans. We also collect usage data to improve our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">2. How We Use Your Information</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We use the information we collect to provide, maintain, and improve our services, process transactions, send notifications, and communicate with you about your account and our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">3. Data Security</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We implement robust security measures to protect your personal information. Your data is encrypted in transit and at rest. We do not store your raw payment details; all transactions are processed securely by Stripe.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">4. Data Sharing</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We do not sell your personal data. We only share information with trusted third-party services necessary to operate our platform (such as payment processors and email service providers), and only under strict confidentiality agreements.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">5. Cookies and Tracking</h2>
              <p className="text-on-surface-variant leading-relaxed">
                We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and understand user behavior to optimize our platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-on-surface">6. Your Rights</h2>
              <p className="text-on-surface-variant leading-relaxed">
                You have the right to access, update, or delete your personal information. You can manage your account data from your dashboard or contact us directly to request data deletion.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

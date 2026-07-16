import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ContactForm from '@/components/ContactForm';

export const metadata = {
  title: 'Contact Support & Sales | LeadLinx',
  description: 'Have questions about AI lead generation? Contact the LeadLinx support and sales team for help with your account, custom plans, and API access.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'Contact LeadLinx',
            description: 'Get in touch with the LeadLinx support and sales team.',
            mainEntity: {
              '@type': 'Organization',
              name: 'LeadLinx Intelligence',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'support@leadlinx.app',
                contactType: 'customer support'
              }
            }
          })
        }}
      />
      <Navbar activePage="contact" />
      
      <main className="flex-1 pb-24">
        <div className="max-w-3xl mx-auto px-6 mt-24">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight animate-fade-in">
              Contact <span className="text-primary">Us</span>
            </h1>
            <p className="text-on-surface-variant max-w-2xl mx-auto font-body animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Have questions or need support? Fill out the form below and our team will get back to you within 24 hours.
            </p>
          </div>

          <div className="bento-card p-8 md:p-12 animate-scale-in mb-16" style={{ animationDelay: '0.2s' }}>
            <ContactForm />
          </div>

            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto mt-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-3xl font-display font-bold mb-8 text-center">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div className="bento-card p-6">
                  <h3 className="font-bold text-lg mb-2">What is AI Lead Generation?</h3>
                  <p className="text-on-surface-variant text-sm">LeadLinx uses advanced AI to scan platforms like Reddit to find highly relevant leads based on your specific keywords and criteria, saving you hours of manual prospecting.</p>
                </div>
                <div className="bento-card p-6">
                  <h3 className="font-bold text-lg mb-2">How are credits consumed?</h3>
                  <p className="text-on-surface-variant text-sm">Each lead successfully extracted and classified by our AI consumes one credit. Failed searches or leads that don't meet our minimum quality threshold do not consume credits.</p>
                </div>
                <div className="bento-card p-6">
                  <h3 className="font-bold text-lg mb-2">What is the minimum quality score for leads?</h3>
                  <p className="text-on-surface-variant text-sm">We only display and charge credits for leads that score 8/10 or above on our intent classification scale, ensuring you only get high-intent prospects.</p>
                </div>
                <div className="bento-card p-6">
                  <h3 className="font-bold text-lg mb-2">Which payment gateway do you use?</h3>
                  <p className="text-on-surface-variant text-sm">We use Tap Payments as our official and highly secure payment gateway. We do not store your credit card information on our servers.</p>
                </div>
                <div className="bento-card p-6">
                  <h3 className="font-bold text-lg mb-2">What is your refund policy?</h3>
                  <p className="text-on-surface-variant text-sm">We offer a 7-day refund policy for unused subscription credits. If you are not satisfied, please open a support ticket from your dashboard within 7 days of purchase to request a full refund.</p>
                </div>
                <div className="bento-card p-6">
                  <h3 className="font-bold text-lg mb-2">How do subscription renewals work?</h3>
                  <p className="text-on-surface-variant text-sm">Subscriptions are billed on a recurring monthly basis via Tap Payments. You can easily manage or cancel your subscription directly from your account dashboard.</p>
                </div>
                <div className="bento-card p-6">
                  <h3 className="font-bold text-lg mb-2">What happens if an extraction job fails?</h3>
                  <p className="text-on-surface-variant text-sm">If a background extraction job fails due to a server error or platform rate limit, no credits are deducted from your account. You will be notified to try the search again later.</p>
                </div>
                <div className="bento-card p-6">
                  <h3 className="font-bold text-lg mb-2">Is my data secure?</h3>
                  <p className="text-on-surface-variant text-sm">Yes, we implement strict security measures. All data is encrypted in transit and at rest, and our payment processor, Tap Payments, is fully PCI-DSS compliant.</p>
                </div>
                <div className="bento-card p-6">
                  <h3 className="font-bold text-lg mb-2">Can I change my keywords during an active search?</h3>
                  <p className="text-on-surface-variant text-sm">Once a background search is initiated, the keywords for that specific job cannot be changed. However, you can start a new search with updated keywords at any time.</p>
                </div>
                <div className="bento-card p-6">
                  <h3 className="font-bold text-lg mb-2">How quickly do you respond to support tickets?</h3>
                  <p className="text-on-surface-variant text-sm">Our support team aims to respond to all inquiries within 24 hours during standard business days. We prioritize technical issues related to extraction failures.</p>
                </div>
              </div>
            </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

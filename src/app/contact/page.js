import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ContactForm from '@/components/ContactForm';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <Navbar activePage="contact" />
      
      <main className="flex-1 pb-24">
        <div className="max-w-3xl mx-auto px-6 mt-24">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight animate-fade-in">
              Need <span className="text-primary">Help?</span>
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
                <h3 className="font-bold text-lg mb-2">How quickly do you respond?</h3>
                <p className="text-on-surface-variant text-sm">We typically respond to all inquiries within 24 hours during business days.</p>
              </div>
              <div className="bento-card p-6">
                <h3 className="font-bold text-lg mb-2">Can I cancel my subscription anytime?</h3>
                <p className="text-on-surface-variant text-sm">Yes, you can cancel your subscription at any time from your account settings.</p>
              </div>
              <div className="bento-card p-6">
                <h3 className="font-bold text-lg mb-2">Do you offer enterprise plans?</h3>
                <p className="text-on-surface-variant text-sm">Yes, we offer custom enterprise plans tailored to your specific needs. Contact us above to discuss details.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

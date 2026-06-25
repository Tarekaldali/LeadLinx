'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Contact form error:', error);
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <Navbar activePage="contact" />
      
      <main className="flex-1 pb-24">
        <div className="max-w-3xl mx-auto px-6 mt-24">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight animate-fade-in">
              Get in <span className="text-primary">Touch</span>
            </h1>
            <p className="text-on-surface-variant max-w-2xl mx-auto font-body animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Have questions or need support? Fill out the form below and our team will get back to you within 24 hours.
            </p>
          </div>

          <div className="bento-card p-8 md:p-12 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            {status === 'success' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Message Sent!</h3>
                <p className="text-on-surface-variant mb-8">
                  Thanks for reaching out. We&apos;ve received your message and will respond shortly.
                </p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="btn-primary px-8 py-3 rounded-xl font-bold transition-all active:scale-95"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === 'error' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm text-center">
                    {errorMessage}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant ml-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-surface-dim/50 border border-border-glass rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-surface-dim/50 border border-border-glass rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant ml-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-surface-dim/50 border border-border-glass rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder="How can we help?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant ml-1">Message</label>
                  <textarea
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-surface-dim/50 border border-border-glass rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-y"
                    placeholder="Describe your inquiry or issue..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full btn-primary py-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {status === 'submitting' ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <span className="material-symbols-outlined text-sm">send</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

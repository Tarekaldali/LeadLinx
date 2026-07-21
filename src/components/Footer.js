import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto w-full py-12 bg-surface-container-lowest border-t border-white/5">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold">
              <span className="text-primary">Lead</span>
              <span className="text-black dark:text-white">Linx</span>
            </div>
          </Link>
          <p className="font-body-sm text-body-sm text-primary mt-2">
            © {new Date().getFullYear()} LeadLinx AI. All rights reserved. Precision lead generation at scale.
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-4 font-body-sm text-body-sm">
          <div className="flex flex-wrap gap-x-8 gap-y-4 md:justify-end">
            <Link href="/" className="text-text-muted hover:text-on-surface transition-colors">Product</Link>
            <Link href="/pricing" className="text-text-muted hover:text-on-surface transition-colors">Features</Link>
            <Link href="/privacy" className="text-text-muted hover:text-on-surface transition-colors">Security</Link>
            <Link href="/privacy" className="text-text-muted hover:text-on-surface transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-text-muted hover:text-on-surface transition-colors">Terms of Service</Link>
            <Link href="/contact" className="text-text-muted hover:text-on-surface transition-colors">Contact Us</Link>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-4 md:justify-end text-xs opacity-70">
            <Link href="/find-leads/crm-alternatives" className="text-text-muted hover:text-on-surface transition-colors">CRM Alternatives</Link>
            <Link href="/find-leads/aws-costs" className="text-text-muted hover:text-on-surface transition-colors">AWS Costs</Link>
            <Link href="/find-leads/lead-generation" className="text-text-muted hover:text-on-surface transition-colors">Lead Generation</Link>
            <Link href="/find-leads/project-management" className="text-text-muted hover:text-on-surface transition-colors">Project Management</Link>
            <Link href="/find-leads/email-marketing" className="text-text-muted hover:text-on-surface transition-colors">Email Marketing</Link>
            <Link href="/find-leads/analytics-tools" className="text-text-muted hover:text-on-surface transition-colors">Analytics Tools</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

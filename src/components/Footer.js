import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-surface-dim w-full py-8 border-t border-border-glass">
      <div className="flex flex-col md:flex-row justify-between items-center px-12 max-w-7xl mx-auto">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-sm font-bold text-on-surface">LeadLinx</span>
          <span className="text-xs text-on-surface-variant">© 2026 LeadLinx Intelligence. All rights reserved.</span>
        </div>
        <div className="flex flex-col md:flex-row gap-12 mt-6 md:mt-0">
          <div className="flex flex-col gap-3">
            <span className="text-on-surface font-semibold text-sm">Legal</span>
            <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/privacy">Privacy Policy</Link>
            <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/terms">Terms of Service</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-on-surface font-semibold text-sm">Use Cases</span>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/find-leads/crm-alternatives">CRM Alternatives</Link>
              <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/find-leads/aws-costs">AWS Costs</Link>
              <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/find-leads/lead-generation">Lead Generation</Link>
              <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/find-leads/project-management">Project Management</Link>
              <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/find-leads/email-marketing">Email Marketing</Link>
              <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/find-leads/analytics-tools">Analytics Tools</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

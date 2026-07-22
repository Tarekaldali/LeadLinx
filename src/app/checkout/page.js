import CheckoutClient from './CheckoutClient';

export const metadata = {
  title: 'Checkout — Upgrade your plan',
  description: 'Complete your secure checkout for LeadLinx to start automating your Reddit lead generation today.',
  alternates: {
    canonical: '/checkout',
  }
};

export const dynamic = 'force-static';

export default function CheckoutPage() {
  return <CheckoutClient />;
}

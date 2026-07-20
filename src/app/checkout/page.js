import CheckoutClient from './CheckoutClient';

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const plan = params?.plan || 'starter';
  const capitalizedPlan = plan.charAt(0).toUpperCase() + plan.slice(1);
  
  return {
    title: `Checkout — Upgrade to ${capitalizedPlan}`,
    description: `Complete your secure checkout for the LeadLinx ${capitalizedPlan} plan to start automating your Reddit lead generation today.`,
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: '/checkout',
    }
  };
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}

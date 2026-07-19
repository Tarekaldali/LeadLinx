import CheckoutClient from './CheckoutClient';

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const plan = params?.plan || 'starter';
  const capitalizedPlan = plan.charAt(0).toUpperCase() + plan.slice(1);
  const canonicalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadlinx.vercel.app'}/checkout?plan=${plan}`;
  
  return {
    title: `Checkout — Upgrade to ${capitalizedPlan} | LeadLinx`,
    description: `Complete your secure checkout for the LeadLinx ${capitalizedPlan} plan to start automating your Reddit lead generation today.`,
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title: `Checkout — Upgrade to ${capitalizedPlan} | LeadLinx`,
      description: `Complete your checkout for the ${capitalizedPlan} plan.`,
      url: canonicalUrl,
    },
    alternates: {
      canonical: canonicalUrl,
    }
  };
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}

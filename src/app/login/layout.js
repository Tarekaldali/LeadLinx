export const metadata = {
  title: 'Log In',
  description: 'Sign in to your LeadLinx account or create a new one to start finding high-intent Reddit leads with AI and automate your social selling pipeline today.',
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    type: 'website',
    url: '/login',
    title: 'Log In',
    description: 'Sign in to your LeadLinx account or create a new one to start finding high-intent Reddit leads with AI and automate your social selling pipeline today.',
  }
};

export default function LoginLayout({ children }) {
  return <>{children}</>;
}

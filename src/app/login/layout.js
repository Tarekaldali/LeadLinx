export const metadata = {
  title: 'Log In',
  description: 'Sign in or create your free LeadLinx account to start finding high-intent Reddit leads with AI.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: '/login',
  },
};

export default function LoginLayout({ children }) {
  return <>{children}</>;
}

'use client';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    localStorage.removeItem('leadlinx.activeChatId');
    await signOut({ redirect: false, callbackUrl: '/' });
    router.replace('/');
    router.refresh();
  };

  return (
    <button 
      onClick={handleLogout}
      className="btn-primary text-sm py-2 px-6"
    >
      Log out
    </button>
  );
}

'use client';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/' })}
      className="btn-primary text-sm py-2 px-6"
    >
      Log out
    </button>
  );
}

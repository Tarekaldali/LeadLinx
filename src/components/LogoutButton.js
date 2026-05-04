'use client';

export default function LogoutButton() {
  return (
    <button 
      onClick={() => {
        fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.href = '/');
      }}
      className="btn-primary text-sm py-2"
    >
      Log out
    </button>
  );
}

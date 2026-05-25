'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function Nav({ user }) {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await apiFetch('/auth/signout', { method: 'POST' });
    } catch {}
    router.push('/signin');
    router.refresh();
  }

  return (
    <nav>
      <Link href="/" className="logo">
        <Sparkles size={20} /> Jobly
      </Link>
      <div className="nav-links">
        <a href="#features">Features</a>
        <a href="#how-it-works">How it works</a>
        <a href="#pricing">Pricing</a>
        {user ? (
          <button onClick={handleSignOut} className="nav-links-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.95rem', fontFamily: 'inherit' }}>
            Sign out
          </button>
        ) : (
          <Link href="/signin">Sign in</Link>
        )}
      </div>
      {user ? (
        <Link href="#app" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
          {user.name.split(' ')[0]}
        </Link>
      ) : (
        <Link href="/signup" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
          Get Started
        </Link>
      )}
    </nav>
  );
}

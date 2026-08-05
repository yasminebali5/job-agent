'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, LayoutGrid, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';

const SECTIONS = [
  { href: '/', label: 'Applications', icon: Sparkles },
  { href: '/resumes', label: 'Resumes', icon: FileText },
  { href: '/companies', label: 'Companies', icon: LayoutGrid },
];

export default function Nav({ user }) {
  const router = useRouter();
  const pathname = usePathname();

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
        <span className="logo-mark">
          <Sparkles size={16} />
        </span>
        Jobly
      </Link>
      <div className="nav-links">
        {SECTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-section-link ${pathname === href ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>
      <div className="nav-actions">
        {user ? (
          <button onClick={handleSignOut} className="nav-link-btn">
            Sign out
          </button>
        ) : (
          <Link href="/signin" className="nav-link-btn">Sign in</Link>
        )}
        {user ? (
          <Link href="/" className="btn btn-primary btn-sm nav-user-pill">
            {user.name.split(' ')[0]}
          </Link>
        ) : (
          <Link href="/signup" className="btn btn-primary btn-sm">
            Get Started
          </Link>
        )}
      </div>
    </nav>
  );
}

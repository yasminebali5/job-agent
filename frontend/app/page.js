'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from './components/Nav';
import JobForm from './components/JobForm';
import { apiFetch } from './lib/api';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch('/auth/me')
      .then((data) => {
        if (active) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) router.replace('/signin');
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  return (
    <>
      <Nav user={user} />

      <header className="hero">
        <h1>
          Your Dream Job, <span>AI Assisted.</span>
        </h1>
        <p>Automate your job applications with personalized, AI-generated emails that grab attention and land interviews.</p>
        <div className="hero-btns">
          <Link href="#app" className="btn btn-primary btn-lg">
            Start Applying Now
          </Link>
          <Link href="#how-it-works" className="btn btn-secondary btn-lg">
            Learn More
          </Link>
        </div>
      </header>

      <JobForm defaultName={user?.name} defaultEmail={user?.email} />
    </>
  );
}

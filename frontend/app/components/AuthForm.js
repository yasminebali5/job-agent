'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function AuthForm({ mode }) {
  const router = useRouter();
  const isSignUp = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = isSignUp ? { name, email, password } : { email, password };
      await apiFetch(isSignUp ? '/auth/signup' : '/auth/signin', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <nav>
        <Link href="/" className="logo">
          <Sparkles size={20} /> Jobly
        </Link>
        <div className="nav-links" style={{ marginLeft: 'auto' }}>
          {isSignUp ? (
            <Link href="/signin">Sign in</Link>
          ) : (
            <Link href="/signup">Create account</Link>
          )}
        </div>
      </nav>

      <main className="container-narrow">
        <div className="card auth-card">
          <h1>{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
          <p className="subtitle">
            {isSignUp
              ? 'Start sending personalized application emails in minutes.'
              : 'Sign in to continue your job search.'}
          </p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="form-row">
                <label>Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson"
                  required
                  minLength={1}
                />
              </div>
            )}

            <div className="form-row">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-row">
              <div className="form-row-header">
                <label>Password</label>
                {!isSignUp && <Link href="/forgot-password">Forgot password?</Link>}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
                required
                minLength={isSignUp ? 8 : undefined}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              {submitting ? <div className="spinner" /> : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="auth-footer">
            {isSignUp ? (
              <>
                Already have an account? <Link href="/signin">Sign in</Link>
              </>
            ) : (
              <>
                Don&apos;t have an account? <Link href="/signup">Create one</Link>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

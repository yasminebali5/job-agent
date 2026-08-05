'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
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
        <div className="nav-links">
          <Link href="/signin">Sign in</Link>
        </div>
        <span />
      </nav>

      <main className="container-narrow">
        <div className="card auth-card">
          <h1>Reset your password</h1>
          <p className="subtitle">
            Enter your account email and we&apos;ll send you a link to reset your password.
          </p>

          {error && <div className="error-banner">{error}</div>}

          {sent ? (
            <p>
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset
              link to it. Check your inbox (and spam folder).
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
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

              <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                {submitting ? <div className="spinner" /> : 'Send reset link'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            Remembered your password? <Link href="/signin">Sign in</Link>
          </div>
        </div>
      </main>
    </>
  );
}

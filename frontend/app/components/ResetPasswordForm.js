'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      setTimeout(() => router.replace('/signin'), 2000);
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
          <h1>Choose a new password</h1>
          <p className="subtitle">Enter a new password for your account.</p>

          {!token && <div className="error-banner">This reset link is missing or invalid.</div>}
          {error && <div className="error-banner">{error}</div>}

          {done ? (
            <p>Your password has been reset. Redirecting you to sign in&hellip;</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-row">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={submitting || !token}
              >
                {submitting ? <div className="spinner" /> : 'Reset password'}
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

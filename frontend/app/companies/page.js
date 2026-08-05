'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Trash2 } from 'lucide-react';
import Nav from '../components/Nav';
import { apiFetch } from '../lib/api';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function CompaniesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch('/auth/me')
      .then((data) => {
        if (!active) return;
        setUser(data);
        return apiFetch('/companies');
      })
      .then((data) => {
        if (active && data) setCompanies(data);
      })
      .catch(() => {
        if (active) router.replace('/signin');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleDelete(id) {
    if (!confirm('Remove this company from your list?')) return;
    try {
      await apiFetch(`/companies/${id}`, { method: 'DELETE' });
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete company.');
    }
  }

  if (loading) {
    return <div className="loading-screen">Loading…</div>;
  }

  const appliedCount = companies.filter((c) => c.applied).length;

  return (
    <>
      <Nav user={user} />

      <div className="page-header">
        <h1>Your Companies</h1>
        <p>
          {companies.length} companies tracked — {appliedCount} applied, {companies.length - appliedCount} pending.
        </p>
      </div>

      <div className="page-container">
        {error && <div className="error-banner">{error}</div>}

        {companies.length === 0 ? (
          <div className="empty-state">
            <Building2 size={40} />
            <p>You haven&apos;t added any companies yet. Add some from the Applications page.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Date Applied</th>
                  <th>CV Used</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-company">{c.name}</td>
                    <td className="cell-muted">{c.email}</td>
                    <td className="cell-desc" title={c.description || ''}>
                      {c.description || '—'}
                    </td>
                    <td>
                      {c.applied ? (
                        <span className="status-pill status-pill--applied">Applied</span>
                      ) : (
                        <span className="status-pill status-pill--pending">Not applied</span>
                      )}
                    </td>
                    <td className="cell-muted">{formatDate(c.applied_at)}</td>
                    <td className="cell-muted">{c.resume_filename || '—'}</td>
                    <td>
                      <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(c.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

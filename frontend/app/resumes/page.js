'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, Trash2, UploadCloud } from 'lucide-react';
import Nav from '../components/Nav';
import { apiFetch, apiUpload, API_URL } from '../lib/api';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ResumesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    apiFetch('/auth/me')
      .then((data) => {
        if (!active) return;
        setUser(data);
        return apiFetch('/resumes');
      })
      .then((data) => {
        if (active && data) setResumes(data);
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

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resume = await apiUpload('/resumes', formData);
      setResumes((prev) => [resume, ...prev]);
    } catch (err) {
      setError(err.message || 'Failed to upload resume.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this resume? Companies that used it will keep their application record, just without a linked CV.')) return;
    try {
      await apiFetch(`/resumes/${id}`, { method: 'DELETE' });
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete resume.');
    }
  }

  if (loading) {
    return <div className="loading-screen">Loading…</div>;
  }

  return (
    <>
      <Nav user={user} />

      <div className="page-header">
        <h1>Your Resumes</h1>
        <p>Upload and manage the CVs you use when applying to companies.</p>
      </div>

      <div className="page-container">
        <div className="resume-upload-card">
          <div>
            <label style={{ marginBottom: 0 }}>Upload a new CV</label>
            <p>PDF, DOC, or DOCX</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <div className="spinner" /> Uploading...
              </>
            ) : (
              <>
                <UploadCloud size={16} /> Upload CV
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        {error && <div className="error-banner">{error}</div>}

        {resumes.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} />
            <p>You haven&apos;t uploaded any resumes yet.</p>
          </div>
        ) : (
          <div className="resume-grid">
            {resumes.map((r) => (
              <div key={r.id} className="resume-card">
                <div className="resume-card-icon">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="resume-card-name">{r.filename}</div>
                  <div className="resume-card-meta">Uploaded {formatDate(r.uploaded_at)}</div>
                </div>
                <div className="resume-card-actions">
                  <a
                    className="icon-btn"
                    href={`${API_URL}/resumes/${r.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={14} /> Download
                  </a>
                  <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(r.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

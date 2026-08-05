'use client';

import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Edit3,
  FileSpreadsheet,
  Paperclip,
  Plus,
  Send,
  UploadCloud,
  Wand2,
  X,
} from 'lucide-react';
import { apiFetch, apiUpload } from '../lib/api';

const LANG_CONFIG = {
  English: {
    flag: '🇬🇧',
    instruction:
      'Write ENTIRELY in English. Every single word of the subject line and email body must be in English. Do not mix in any other language.',
    greeting: 'Dear Hiring Manager',
  },
  French: {
    flag: '🇫🇷',
    instruction:
      "Écris ENTIÈREMENT en français. Chaque mot de l'objet et du corps de l'email doit être en français. N'utilise aucun mot dans une autre langue.",
    greeting: 'Madame, Monsieur',
  },
  Arabic: {
    flag: '🇹🇳',
    instruction:
      'اكتب بالكامل باللغة العربية. كل كلمة في سطر الموضوع وجسم البريد الإلكتروني يجب أن تكون باللغة العربية. لا تمزج أي لغة أخرى.',
    greeting: 'السيد/السيدة المسؤول عن التوظيف',
  },
  Spanish: {
    flag: '🇪🇸',
    instruction:
      'Escribe COMPLETAMENTE en español. Cada palabra del asunto y del cuerpo del correo debe estar en español. No mezcles ningún otro idioma.',
    greeting: 'Estimado/a responsable de selección',
  },
  German: {
    flag: '🇩🇪',
    instruction:
      'Schreibe VOLLSTÄNDIG auf Deutsch. Jedes Wort der Betreffzeile und des E-Mail-Textes muss auf Deutsch sein. Mische keine andere Sprache ein.',
    greeting: 'Sehr geehrte Damen und Herren',
  },
};

const MAX_COMPANIES = 10;

export default function JobForm({ defaultName, defaultEmail }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    name: defaultName || '',
    email: defaultEmail || '',
    role: '',
    skills: '',
  });
  const [cvFileName, setCvFileName] = useState('');
  const [cvResumeId, setCvResumeId] = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [companyInput, setCompanyInput] = useState({ name: '', email: '', desc: '' });
  const [companies, setCompanies] = useState([]);
  const [tone, setTone] = useState('professional and enthusiastic');
  const [lang, setLang] = useState('English');
  const [extraNote, setExtraNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateErr, setGenerateErr] = useState(false);
  const [emails, setEmails] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [dragging, setDragging] = useState(false);

  const cvInputRef = useRef(null);
  const excelInputRef = useRef(null);

  async function handleCv(file) {
    if (!file) return;
    setCvFileName(file.name);
    setCvResumeId(null);
    setCvUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resume = await apiUpload('/resumes', formData);
      setCvResumeId(resume.id);
    } catch (err) {
      console.error('Resume upload failed:', err);
      alert(`Failed to upload CV: ${err.message || 'unknown error'}`);
      setCvFileName('');
    } finally {
      setCvUploading(false);
    }
  }

  function onCvChange(e) {
    handleCv(e.target.files?.[0]);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    handleCv(f);
  }

  async function addCompany() {
    if (companies.length >= MAX_COMPANIES) {
      alert(`You can only select up to ${MAX_COMPANIES} companies at a time.`);
      return;
    }
    if (!companyInput.name.trim() || !companyInput.email.trim()) {
      alert('Please provide at least company name and email.');
      return;
    }
    try {
      const created = await apiFetch('/companies', {
        method: 'POST',
        body: JSON.stringify({
          name: companyInput.name.trim(),
          email: companyInput.email.trim(),
          description: companyInput.desc.trim(),
          resume_id: cvResumeId,
        }),
      });
      setCompanies([
        ...companies,
        { id: created.id, name: created.name, email: created.email, desc: created.description || '' },
      ]);
      setCompanyInput({ name: '', email: '', desc: '' });
    } catch (err) {
      alert(`Failed to save company: ${err.message || 'unknown error'}`);
    }
  }

  async function removeCompany(id) {
    setCompanies(companies.filter((c) => c.id !== id));
    try {
      await apiFetch(`/companies/${id}`, { method: 'DELETE' });
    } catch {}
  }

  async function handleExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (companies.length >= MAX_COMPANIES) {
      alert(`You have already reached the limit of ${MAX_COMPANIES} companies.`);
      e.target.value = '';
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      if (json.length === 0) {
        alert('The Excel file is empty.');
        return;
      }

      const parsed = json
        .map((row) => {
          const keys = Object.keys(row);
          const nameKey = keys.find(
            (k) => k.toLowerCase().includes('company') || k.toLowerCase().includes('name'),
          );
          const emailKey = keys.find(
            (k) => k.toLowerCase().includes('email') || k.toLowerCase().includes('contact'),
          );
          const descKey = keys.find(
            (k) =>
              k.toLowerCase().includes('desc') ||
              k.toLowerCase().includes('info') ||
              k.toLowerCase().includes('about'),
          );
          if (nameKey && emailKey) {
            return {
              id: Date.now() + Math.random(),
              name: row[nameKey],
              email: row[emailKey],
              desc: descKey ? row[descKey] : '',
            };
          }
          return null;
        })
        .filter(Boolean);

      if (parsed.length === 0) {
        alert('Could not find "Company" and "Email" columns in the Excel file.');
        return;
      }

      const remaining = MAX_COMPANIES - companies.length;
      const toAdd = parsed.slice(0, remaining);

      const created = await Promise.all(
        toAdd.map((c) =>
          apiFetch('/companies', {
            method: 'POST',
            body: JSON.stringify({
              name: String(c.name),
              email: String(c.email),
              description: c.desc ? String(c.desc) : '',
              resume_id: cvResumeId,
            }),
          }).catch((err) => {
            console.error('Failed to save imported company:', err);
            return null;
          }),
        ),
      );
      const saved = created
        .filter(Boolean)
        .map((c) => ({ id: c.id, name: c.name, email: c.email, desc: c.description || '' }));
      setCompanies([...companies, ...saved]);

      if (saved.length < toAdd.length) {
        alert(`Imported ${saved.length} of ${toAdd.length} companies. Some failed to save — check the console.`);
      } else if (parsed.length > remaining) {
        alert(
          `Successfully imported ${saved.length} companies. Note: ${parsed.length - remaining} were skipped (limit ${MAX_COMPANIES}).`,
        );
      } else {
        alert(`Successfully imported ${saved.length} companies!`);
      }
    } catch (err) {
      console.error('Excel Parsing Error:', err);
      alert('Failed to parse Excel file. Make sure it is a valid .xlsx or .csv file.');
    } finally {
      e.target.value = '';
    }
  }

  async function generateEmails() {
    if (companies.length === 0) {
      alert('Add at least one company first.');
      return;
    }
    setGenerating(true);
    setGenerateErr(false);

    const langCfg = LANG_CONFIG[lang] || LANG_CONFIG.English;

    const prompt = `${langCfg.instruction}

You are a job application assistant. For each company below, write a spontaneous candidacy email.
Return ONLY a valid JSON array. No markdown, no explanation, no extra text before or after.
Each item must have exactly these keys: company, to, subject, body.

CRITICAL LANGUAGE RULE: The "subject" and "body" fields must be written in ${lang}. This is mandatory. Do not use any other language.

Candidate name: ${profile.name}
Candidate role: ${profile.role}
Candidate skills: ${profile.skills}
Tone: ${tone}
Extra notes: ${extraNote || 'none'}

Companies:
${companies.map((c) => `- ${c.name} (${c.email}): ${c.desc || 'no description provided'}`).join('\n')}

Rules:
- Keep each email under 200 words
- Open with a personalized sentence about the company
- End with a clear call to action
- Use "${langCfg.greeting}" as the greeting salutation
- Sign off with the candidate's name
- Subject line must also be in ${lang}`;

    try {
      const data = await apiFetch('/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const text = data?.content?.[0]?.text;
      if (!text) throw new Error('Empty response from API.');

      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      setEmails(parsed);
      setCurrentIdx(0);
      setSentCount(0);
      setSkippedCount(0);
      setStep(4);
    } catch (err) {
      console.error('Generation failed:', err);
      setGenerateErr(true);
      setTimeout(() => setGenerateErr(false), 3000);
    } finally {
      setGenerating(false);
    }
  }

  function sendEmail() {
    const e = emails[currentIdx];
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e.to)}&su=${encodeURIComponent(e.subject)}&body=${encodeURIComponent(e.body)}`;
    window.open(url, '_blank');
    setSentCount((c) => c + 1);
    setEditing(false);

    const company =
      companies.find((c) => c.name.trim().toLowerCase() === (e.company || '').trim().toLowerCase()) ||
      companies[currentIdx];
    if (company) {
      apiFetch(`/companies/${company.id}/apply`, {
        method: 'PATCH',
        body: JSON.stringify({ resume_id: cvResumeId }),
      }).catch((err) => console.error('Failed to mark company as applied:', err));
    }

    setCurrentIdx((i) => i + 1);
  }

  function skipEmail() {
    setSkippedCount((c) => c + 1);
    setCurrentIdx((i) => i + 1);
    setEditing(false);
  }

  function startEdit() {
    setEditBody(emails[currentIdx].body);
    setEditing(true);
  }

  function saveEdit() {
    const updated = [...emails];
    updated[currentIdx] = { ...updated[currentIdx], body: editBody };
    setEmails(updated);
    setEditing(false);
  }

  function resetAll() {
    window.location.reload();
  }

  const langCfg = LANG_CONFIG[lang] || LANG_CONFIG.English;
  const onLastReview = currentIdx >= emails.length && emails.length > 0;

  return (
    <main className="container" id="app">
      <div className="card">
        <div className="step-indicator">
          {['Profile', 'Targets', 'Customize', 'Review'].map((label, i) => (
            <div key={label} className={`step-item ${i + 1 <= step ? 'active' : ''}`}>
              <div className="step-dot">{i + 1}</div>
              <div className="step-label">{label}</div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <section className="form-section active">
            <h2 className="section-title">Tell us about yourself</h2>
            <p className="section-desc">We&apos;ll use this info to personalize your application emails.</p>

            <div className="grid">
              <div>
                <label>Full Name</label>
                <input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Alex Johnson"
                />
              </div>
              <div>
                <label>Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="alex@example.com"
                />
              </div>
            </div>

            <div className="field">
              <label>Current Role / Headline</label>
              <input
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                placeholder="Senior Product Designer with 6+ years experience"
              />
            </div>

            <div className="field">
              <label>Key Skills</label>
              <input
                value={profile.skills}
                onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                placeholder="Figma, React, UX Research, Design Systems..."
              />
            </div>

            <label>Upload CV (Optional)</label>
            <div
              className={`file-zone ${dragging ? 'dragging' : ''}`}
              onClick={() => cvInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <UploadCloud size={48} />
              <p>Drag and drop your CV here, or click to browse</p>
              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={onCvChange}
              />
            </div>
            {cvFileName && (
              <div className="file-attached">
                <Paperclip size={16} /> {cvFileName} {cvUploading && '· Uploading…'}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <div />
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={cvUploading}>
                Next Step <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="form-section active">
            <div className="section-header">
              <h2 className="section-title">Who are you applying to?</h2>
              <span className={`count-badge ${companies.length >= MAX_COMPANIES ? 'count-badge--full' : ''}`}>
                {companies.length} / {MAX_COMPANIES}
              </span>
            </div>
            <p className="section-desc">Add up to {MAX_COMPANIES} companies and contacts you want to reach out to.</p>

            <div className="grid">
              <div>
                <label>Company Name</label>
                <input
                  value={companyInput.name}
                  onChange={(e) => setCompanyInput({ ...companyInput, name: e.target.value })}
                  placeholder="Google, Stripe, etc."
                />
              </div>
              <div>
                <label>Hiring Manager Email</label>
                <input
                  type="email"
                  value={companyInput.email}
                  onChange={(e) => setCompanyInput({ ...companyInput, email: e.target.value })}
                  placeholder="hiring@company.com"
                />
              </div>
            </div>

            <div className="field">
              <label>What they do (Short description)</label>
              <input
                value={companyInput.desc}
                onChange={(e) => setCompanyInput({ ...companyInput, desc: e.target.value })}
                placeholder="A fintech startup focused on global payments..."
              />
            </div>

            <div className="action-grid">
              <button className="btn btn-secondary w-full" onClick={addCompany}>
                <Plus size={16} /> Add Manually
              </button>
              <button className="btn btn-secondary w-full" onClick={() => excelInputRef.current?.click()}>
                <FileSpreadsheet size={16} /> Import Excel
              </button>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleExcel}
              />
            </div>

            <div className="tag-list">
              {companies.map((c) => (
                <div key={c.id} className="tag">
                  <span>{c.name}</span>
                  <button onClick={() => removeCompany(c.id)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                Next Step <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="form-section active">
            <h2 className="section-title">Final touches</h2>
            <p className="section-desc">Set the tone and language for your emails.</p>

            <div className="grid">
              <div>
                <label>Language</label>
                <select value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="English">🇬🇧 English</option>
                  <option value="French">🇫🇷 Français</option>
                  <option value="Arabic">🇹🇳 العربية</option>
                  <option value="Spanish">🇪🇸 Español</option>
                  <option value="German">🇩🇪 Deutsch</option>
                </select>
              </div>
              <div>
                <label>Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option value="professional and enthusiastic">Professional & Enthusiastic</option>
                  <option value="formal and concise">Formal & Concise</option>
                  <option value="friendly and direct">Friendly & Direct</option>
                  <option value="creative and bold">Creative & Bold</option>
                </select>
              </div>
            </div>

            <label>Extra context for AI</label>
            <textarea
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              placeholder="e.g. Mention my interest in their recent Series B funding..."
            />

            <div className="mt-6 flex justify-between">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className={`btn btn-primary ${generateErr ? 'btn-danger' : ''}`}
                onClick={generateEmails}
                disabled={generating}
                title={generateErr ? 'Something went wrong. Check the browser console (F12).' : undefined}
              >
                {generating ? (
                  <>
                    <div className="spinner" /> Generating...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} /> Generate Emails
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="form-section active">
            <div className="section-header mb-6">
              <div className="flex items-center">
                <h2 className="section-title">Review Emails</h2>
                <span className="lang-badge">
                  {langCfg.flag} {lang}
                </span>
              </div>
              {!onLastReview && (
                <span className="count-value">
                  {currentIdx + 1} / {emails.length}
                </span>
              )}
            </div>

            {!onLastReview && (
              <div>
                <div className="review-meta">
                  <div className="meta-item">
                    <span className="meta-label">To:</span>
                    <span className="meta-value">{emails[currentIdx].to}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Company:</span>
                    <span className="meta-value">{emails[currentIdx].company}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Subject:</span>
                    <span className="meta-value">{emails[currentIdx].subject}</span>
                  </div>
                </div>

                <div className="email-body-preview">{emails[currentIdx].body}</div>

                <div className="mt-6 flex gap-4">
                  <button className="btn btn-primary w-full" onClick={sendEmail}>
                    <Send size={16} /> Send Email
                  </button>
                  <button className="btn btn-secondary w-full" onClick={skipEmail}>
                    Skip
                  </button>
                </div>

                <button className="btn btn-secondary w-full mt-6" onClick={startEdit}>
                  <Edit3 size={16} /> Edit Body
                </button>

                {editing && (
                  <div className="mt-6">
                    <textarea
                      className="edit-textarea"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                    <button className="btn btn-primary w-full" onClick={saveEdit}>
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            )}

            {onLastReview && (
              <div className="success-panel">
                <div className="success-icon">
                  <Check size={28} />
                </div>
                <h2 className="section-title">Mission Accomplished!</h2>
                <p>
                  You sent {sentCount} emails and skipped {skippedCount}. Good luck with your search!
                </p>
                <button className="btn btn-primary" onClick={resetAll}>
                  Start Over
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function parseResponse(res) {
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const message = data?.detail || data?.error || `Request failed with ${res.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  return data;
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  return parseResponse(res);
}

// For multipart/form-data uploads — the browser must set its own Content-Type
// (with boundary), so this bypasses apiFetch's JSON header.
export async function apiUpload(path, formData, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    ...options,
  });
  return parseResponse(res);
}

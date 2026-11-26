import { auth } from './firebase';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in to use AI features.');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function apiPost<TReq, TRes>(url: string, body: TReq): Promise<TRes> {
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as TRes;
}

export async function apiUploadResume<TRes>(url: string, file: File): Promise<TRes> {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('resume', file);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data as TRes;
}

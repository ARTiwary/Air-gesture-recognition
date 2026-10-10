import { API_URL } from "./config";

// The session token lives only in page memory: nothing in localStorage, cookies or disk.
// Reloading the page starts a fresh session.
let token = null;
export const getToken = () => token;
export const setToken = (t) => { token = t; };

export async function api(path, { method = "GET", json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  else if (form) body = form;
  const res = await fetch(`${API_URL}${path}`, { method, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || "Request failed."), { status: res.status });
  return data;
}

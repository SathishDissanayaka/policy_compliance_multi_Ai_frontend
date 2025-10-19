import { getToken } from "../lib/auth";

const BASE_URL = "http://127.0.0.1:5000";

async function authHeaders() {
  const token = await getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function listSessions() {
  const res = await fetch(`${BASE_URL}/chat/sessions`, {
    method: "GET",
    headers: await authHeaders(),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(`Failed to list sessions (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.sessions) ? data.sessions : [];
}

export async function getSessionMessages(sessionId) {
  const res = await fetch(
    `${BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: "GET",
      headers: await authHeaders(),
    }
  );
  if (res.status === 401) throw new Error("Unauthorized");
  if (res.status === 403) throw new Error("Forbidden");
  if (res.status === 404) throw new Error("Not Found");
  if (!res.ok) throw new Error(`Failed to fetch messages (${res.status})`);
  const data = await res.json();
  return data;
}

export async function deleteSession(sessionId) {
  const res = await fetch(
    `${BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "DELETE",
      headers: await authHeaders(),
    }
  );
  if (res.status === 401) throw new Error("Unauthorized");
  if (res.status === 403) throw new Error("Forbidden");
  if (res.status === 404) throw new Error("Not Found");
  if (!res.ok) throw new Error(`Failed to delete session (${res.status})`);
  const data = await res.json();
  return data;
}

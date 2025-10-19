import { getToken } from "../lib/auth";

// Helper to send subscription selection to backend
export default async function sendSubscription(userId, plan) {
  console.log("sendSubscription", userId, plan);
  const base = "http://127.0.0.1:5000";
  const url = "http://127.0.0.1:5000/user/subscrition";

  const payload = {
    userId,
    plan,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getToken()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `Failed to send subscription: ${res.status} ${res.statusText} ${text}`
    );
    err.response = res;
    throw err;
  }

  return res.json().catch(() => ({}));
}

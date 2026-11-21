// All calls go through the Vite proxy / reverse proxy to the FastAPI backend. Session lives in an HttpOnly cookie,
// so no token is ever readable by JavaScript.
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api${path}`, {
    method, credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    if (res.status === 404 && d === "Not Found") throw new Error("The server does not have this feature. Stop the backend, unzip the latest project files over your copy, and start it again.");
    throw new Error(Array.isArray(d) ? d.map((e) => e.msg.replace("Value error, ", "")).join(" ") : d || "Something went wrong. Try again.");
  }
  return data;
}

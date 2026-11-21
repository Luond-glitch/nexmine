import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";

export default function ResetPage() {
  const [q] = useSearchParams();
  const [pw, setPw] = useState(""); const [msg, setMsg] = useState(null);
  const go = async (e) => {
    e.preventDefault();
    try { const r = await api("/auth/reset-password", { method: "POST", body: { token: q.get("token") || "", password: pw } }); setMsg({ ok: true, t: r.message }); }
    catch (err) { setMsg({ ok: false, t: err.message }); }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-canopy p-4">
      <form onSubmit={go} className="pop w-full max-w-md space-y-4 rounded-2xl bg-mist p-8">
        <h1 className="font-display text-2xl font-extrabold text-goldhi">Set a new password</h1>
        <p className="text-sm">Use at least 4 characters (6 for experts) and include one special character, for example @ # ! ? $ %.</p>
        <div><label htmlFor="np" className="label">New password</label>
          <input id="np" type="password" className="field" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
        {msg && <p role="alert" className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-moss" : "bg-red-100 text-red-800"}`}>{msg.t}</p>}
        <button className="btn btn-green w-full">Save password</button>
        <Link to="/" className="block text-center text-sm font-semibold text-forest hover:underline">Go to home</Link>
      </form>
    </main>
  );
}

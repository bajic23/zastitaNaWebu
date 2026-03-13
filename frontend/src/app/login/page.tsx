"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "Login failed");
        return;
      }

      document.cookie = `access_token=${data.token}; Path=/; SameSite=Lax`;

      document.cookie = `role=${data.user.role}; Path=/; SameSite=Lax`;

      router.replace(next);
    } catch (err) {
      setMsg("Greška pri konekciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1>Login</h1>

      <form
        onSubmit={onSubmit}
        style={{ display: "grid", gap: 10, marginTop: 12 }}
      >
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          placeholder="Lozinka"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button disabled={loading} type="submit">
          {loading ? "..." : "Uloguj se"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          window.location.href = "http://localhost:5000/api/auth/google";
        }}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50"
      >
        Prijava preko Google-a
      </button>

      {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
    </div>
  );
}

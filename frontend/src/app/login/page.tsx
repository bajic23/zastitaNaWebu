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
    } catch {
      setMsg("Greška pri konekciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="w-120 max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur">
          <section className="p-6">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
                  Zaštita na Webu
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  Prijavi se na nalog
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Unesi svoje podatke za pristup aplikaciji.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="unesi@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Lozinka
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Unesi lozinku"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {msg ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {msg}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Prijava u toku..." : "Uloguj se"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    "http://localhost:5000/api/auth/google";
                }}
                className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                Prijava preko Google-a
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  ili
                </span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <button
                type="button"
                onClick={() => {
                  router.push("/register");
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                Registruj se
              </button>

              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 md:hidden">
                <p className="text-sm font-semibold text-white">
                  ZaštitaNaWebu
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

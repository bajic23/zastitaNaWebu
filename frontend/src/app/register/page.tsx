"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verifyLink, setVerifyLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validatePassword(pw: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(pw);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSuccess(null);
    setVerifyLink(null);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setMsg("Sva polja su obavezna.");
      return;
    }

    if (password !== confirmPassword) {
      setMsg("Lozinka i potvrda lozinke se ne poklapaju.");
      return;
    }

    if (!validatePassword(password)) {
      setMsg(
        "Lozinka mora imati minimum 10 karaktera i bar: 1 veliko slovo, 1 malo slovo, 1 broj i 1 specijalni znak.",
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "Registracija nije uspela.");
        return;
      }

      setSuccess(
        "Uspešna registracija. Email servis je mockovan, pa možeš odmah kliknuti na dugme ispod za verifikaciju naloga.",
      );

      if (data?.emailVerifyToken) {
        setVerifyLink(`/verify-email?token=${data.emailVerifyToken}`);
      }

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setMsg("Greška pri konekciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="w-130 max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur md:grid-cols-2">
          <section className="p-6 sm:p-8 md:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
                  Register
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  Registracija korisnika
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Unesi svoje podatke za kreiranje novog naloga.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Ime i prezime
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Pavle Petrović"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

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
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Potvrda lozinke
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Ponovi lozinku"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
                  Lozinka mora imati minimum 10 karaktera i bar 1 veliko slovo,
                  1 malo slovo, 1 broj i 1 specijalni znak.
                </div>

                {msg ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {msg}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                    {success}
                  </div>
                ) : null}

                {verifyLink ? (
                  <a
                    href={verifyLink}
                    className="block rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-center font-semibold text-green-200 transition hover:bg-green-500/20"
                  >
                    Verifikuj email
                  </a>
                ) : null}

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Registracija u toku..." : "Registruj se"}
                </button>
              </form>

              <p className="mt-6 text-sm text-slate-400">
                Već imaš nalog?{" "}
                <Link
                  href="/login"
                  className="font-medium text-blue-300 transition hover:text-blue-200"
                >
                  Idi na login
                </Link>
              </p>

              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 md:hidden">
                <p className="text-sm font-semibold text-white">
                  ZaštitaNaWebu
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Registracija korisnika uz validaciju lozinke i email potvrdu.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

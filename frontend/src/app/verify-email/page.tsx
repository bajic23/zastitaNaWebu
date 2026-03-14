"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setError("Nedostaje verifikacioni token.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:5000/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Verifikacija email-a nije uspela.");
        }

        setSuccess(data?.message || "Email je uspešno verifikovan.");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Došlo je do greške prilikom verifikacije.",
        );
      } finally {
        setLoading(false);
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <main className="min-h-screen px-4 py-8 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="w-100 max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur md:grid-cols-2">
          <section className="p-6 sm:p-8 md:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
                  Verify email
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  Verifikacija email adrese
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Sistem proverava verifikacioni token.
                </p>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                  <p className="text-slate-300">Verifikacija u toku...</p>
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5">
                  <h3 className="text-lg font-bold text-white">
                    Verifikacija uspešna
                  </h3>
                  <p className="mt-2 text-sm text-green-200">{success}</p>

                  <div className="mt-5">
                    <Link
                      href="/login"
                      className="inline-block rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                    >
                      Idi na login
                    </Link>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
                  <h3 className="text-lg font-bold text-white">
                    Verifikacija nije uspela
                  </h3>
                  <p className="mt-2 text-sm text-red-200">{error}</p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/register"
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
                    >
                      Nazad na registraciju
                    </Link>

                    <Link
                      href="/login"
                      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 font-medium text-blue-200 transition hover:bg-blue-500/20"
                    >
                      Idi na login
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 md:hidden">
                <p className="text-sm font-semibold text-white">
                  ZaštitaNaWebu
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Email verifikacija pre prijave u sistem.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

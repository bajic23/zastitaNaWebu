"use client";

import { useEffect, useState } from "react";

type MeResponse = {
  user: {
    name?: string;
    email: string;
    role: "USER" | "ADMIN";
    emailVerified: boolean;
    lastLoginAt?: string | null;
    hasGoogleAccount?: boolean;
  };
};

function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

export default function AdminPage() {
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getCookie("access_token");

    if (!token) {
      setError("Niste ulogovani.");
      setLoading(false);
      return;
    }

    async function loadMe() {
      try {
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Greška pri učitavanju korisnika.");
        }

        if (data.user.role !== "ADMIN") {
          throw new Error("Nemate pristup admin stranici.");
        }

        setUser(data.user);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Došlo je do nepoznate greške.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadMe();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          Učitavanje admin panela...
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-white">Pristup odbijen</h1>
          <p className="mt-2 text-red-200">
            {error || "Nemate dozvolu za pristup ovoj stranici."}
          </p>

          <div className="mt-4">
            <a
              href="/dashboard"
              className="inline-block rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Nazad na dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-purple-500/20 bg-linear-to-br from-purple-600/20 to-slate-900 p-6 shadow-xl">
          <h1 className="text-3xl font-extrabold text-white">Admin Panel</h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            Ova stranica je dostupna samo administratorima. Ovde možeš da
            upravljaš sistemom i pristupaš admin funkcijama.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm font-medium text-purple-200">
              ADMIN pristup
            </span>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-200">
              {user.hasGoogleAccount ? "Google OAuth" : "Email + password"}
            </span>
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-medium text-green-200">
              {user.emailVerified ? "Email verified" : "Email not verified"}
            </span>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Administrator</p>
            <p className="mt-2 text-xl font-bold text-white">
              {user.name || user.email}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Email</p>
            <p className="mt-2 text-xl font-bold text-white">{user.email}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Rola</p>
            <p className="mt-2 text-xl font-bold text-white">{user.role}</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white">Admin akcije</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <a
              href="/dashboard"
              className="block rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Nazad na dashboard
            </a>

            <a
              href="/logout"
              className="block rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center font-medium text-red-200 transition hover:bg-red-500/20"
            >
              Logout
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

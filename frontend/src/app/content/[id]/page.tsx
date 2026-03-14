"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type ContentItem = {
  id: string;
  title: string;
  text: string;
  roles?: string[];
};

function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

export default function ContentPage() {
  const params = useParams();
  const id = params.id as string;

  const [content, setContent] = useState<ContentItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getCookie("access_token");

    if (!token) {
      setError("Niste ulogovani.");
      setLoading(false);
      return;
    }

    async function loadContent() {
      try {
        const res = await fetch(`http://localhost:5000/api/content/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Greška pri učitavanju sadržaja.");
        }

        setContent(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Došlo je do nepoznate greške.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <p className="text-slate-300">Učitavanje sadržaja...</p>
        </div>
      </main>
    );
  }

  if (error || !content) {
    return (
      <main className="min-h-screen px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-white">Pristup nije moguć</h1>
          <p className="mt-2 text-red-200">
            {error || "Sadržaj nije pronađen."}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Nazad na dashboard
            </Link>

            <Link
              href="/logout"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-medium text-red-200 transition hover:bg-red-500/20"
            >
              Logout
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const accessBadge =
    content.id === "3"
      ? "Admin only"
      : content.id === "4"
        ? "Manager + Admin"
        : "Svi ulogovani korisnici";

  return (
    <main className="min-h-screen px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <section className="mb-6 rounded-3xl border border-blue-500/20 bg-linear-to-br from-blue-600/20 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
                Protected content
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white">
                {content.title}
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Ovaj sadržaj je dostupan u skladu sa pravilima pristupa i RBAC
                logikom sistema.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Back
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-200">
              Content ID: {content.id}
            </span>

            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-medium text-green-200">
              Protected route
            </span>

            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm font-medium text-purple-200">
              {accessBadge}
            </span>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg lg:col-span-2">
            <h2 className="mb-4 text-2xl font-bold text-white">
              Sadržaj dokumenta
            </h2>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
              <p className="whitespace-pre-line text-base leading-7 text-slate-200">
                {content.text}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <h3 className="mb-5 text-xl font-bold text-white">Detalji</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">ID</span>
                <span className="text-sm font-semibold text-white">
                  {content.id}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">Naziv</span>
                <span className="text-sm font-semibold text-white text-right">
                  {content.title}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Pristup</span>
                <span className="text-sm font-semibold text-white text-right">
                  {accessBadge}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/dashboard"
                className="block rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Nazad na dashboard
              </Link>

              <Link
                href="/logout"
                className="block rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Logout
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Destination = {
  _id: string;
  name: string;
  country: string;
  description?: string;
};

type CreatedBy = {
  _id: string;
  name?: string;
  email?: string;
  role?: "PUTNIK" | "OPERATOR";
};

type Travel = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  destination: Destination;
  createdBy?: CreatedBy;
};

type TravelResponse = {
  travel: Travel;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Nema podatka";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nema podatka";

  return date.toLocaleString("sr-RS");
}

export default function TravelDetailsPage() {
  const params = useParams();
  const slug = String(params.slug || "");

  const [travel, setTravel] = useState<Travel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTravel() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/travels/${slug}`,
        );

        const data: TravelResponse = await res.json();

        if (!res.ok) {
          throw new Error(
            (data as unknown as { message?: string })?.message ||
              "Greška pri učitavanju putovanja.",
          );
        }

        setTravel(data.travel);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Greška pri učitavanju putovanja.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadTravel();
    } else {
      setLoading(false);
      setError("Slug nije prosleđen.");
    }
  }, [slug]);

  const imageSrc = useMemo(() => {
    if (!travel?.imageUrl) return null;
    return `${process.env.NEXT_PUBLIC_API_URL}${travel.imageUrl}`;
  }, [travel]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <p className="text-slate-300">Učitavanje detalja putovanja...</p>
        </div>
      </main>
    );
  }

  if (error || !travel) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-white">
            Putovanje nije dostupno
          </h1>
          <p className="mt-2 text-red-200">
            {error || "Traženo putovanje nije pronađeno."}
          </p>

          <div className="mt-4">
            <Link
              href="/travels"
              className="inline-block rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Nazad na putovanja
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl">
          <div className="h-72 w-full bg-slate-800 md:h-96">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={travel.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Nema slike za ovo putovanje
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-200">
                {travel.destination?.name || "Nepoznata destinacija"}
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200">
                {travel.destination?.country || "Nema države"}
              </span>

              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
                {formatPrice(travel.price)}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold text-white">
              {travel.title}
            </h1>

            <p className="mt-3 max-w-4xl whitespace-pre-line text-base leading-7 text-slate-300">
              {travel.description || "Opis nije dostupan."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/travels"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Nazad na listu
              </Link>

              <Link
                href="/dashboard"
                className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 font-medium text-blue-200 transition hover:bg-blue-500/20"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg lg:col-span-2">
            <h2 className="mb-4 text-2xl font-bold text-white">
              O destinaciji
            </h2>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
              <p className="text-sm text-slate-400">Naziv destinacije</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {travel.destination?.name || "Nema podatka"}
              </p>

              <p className="mt-4 text-sm text-slate-400">Država</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {travel.destination?.country || "Nema podatka"}
              </p>

              <p className="mt-4 text-sm text-slate-400">Opis destinacije</p>
              <p className="mt-1 whitespace-pre-line text-base leading-7 text-slate-200">
                {travel.destination?.description ||
                  "Opis destinacije nije dostupan."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <h3 className="mb-5 text-xl font-bold text-white">Detalji</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">Slug</span>
                <span className="text-sm font-semibold text-white">
                  {travel.slug}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">Cena</span>
                <span className="text-sm font-semibold text-white">
                  {formatPrice(travel.price)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">Kreirao</span>
                <span className="text-sm text-right font-semibold text-white">
                  {travel.createdBy?.name ||
                    travel.createdBy?.email ||
                    "Nema podatka"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">Datum kreiranja</span>
                <span className="text-sm text-right font-semibold text-white">
                  {formatDate(travel.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Poslednja izmena</span>
                <span className="text-sm text-right font-semibold text-white">
                  {formatDate(travel.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Destination = {
  _id: string;
  name: string;
  country: string;
  description?: string;
};

type Travel = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  imageUrl?: string;
  destination: Destination;
  createdAt?: string;
};

type TravelsResponse = {
  travels: Travel[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type DestinationsResponse = {
  destinations: Destination[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TravelsPage() {
  const [travels, setTravels] = useState<Travel[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [destination, setDestination] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 9,
    pages: 1,
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("limit", "9");
    params.set("sort", sort);

    if (search.trim()) params.set("search", search.trim());
    if (destination) params.set("destination", destination);
    if (minPrice.trim()) params.set("minPrice", minPrice.trim());
    if (maxPrice.trim()) params.set("maxPrice", maxPrice.trim());

    return params.toString();
  }, [page, sort, search, destination, minPrice, maxPrice]);

  useEffect(() => {
    async function loadDestinations() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/destinations`,
        );
        const data: DestinationsResponse = await res.json();

        if (!res.ok) {
          throw new Error(
            (data as unknown as { message?: string })?.message ||
              "Greška pri učitavanju destinacija.",
          );
        }

        setDestinations(data.destinations || []);
      } catch {
        setDestinations([]);
      }
    }

    loadDestinations();
  }, []);

  useEffect(() => {
    async function loadTravels() {
      try {
        setLoading(true);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/travels?${queryString}`,
        );

        const data: TravelsResponse = await res.json();

        if (!res.ok) {
          throw new Error(
            (data as unknown as { message?: string })?.message ||
              "Greška pri učitavanju putovanja.",
          );
        }

        setTravels(data.travels || []);
        setPagination(
          data.pagination || {
            total: 0,
            page: 1,
            limit: 9,
            pages: 1,
          },
        );
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

    loadTravels();
  }, [queryString]);

  function resetFilters() {
    setSearch("");
    setDestination("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl border border-blue-500/20 bg-linear-to-br from-blue-600/20 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
                Javna ponuda
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white">
                Pregled svih putovanja
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Pretraži ponudu putovanja, filtriraj po destinaciji i ceni i
                otvori detalje preko sluga.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 font-medium text-blue-200 transition hover:bg-blue-500/20"
              >
                Registruj se
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Pretraga
              </label>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Pretraži po nazivu putovanja"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Destinacija
              </label>
              <select
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              >
                <option value="">Sve destinacije</option>
                {destinations.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Minimalna cena
              </label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                placeholder="0"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Maksimalna cena
              </label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                placeholder="100000"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Sortiranje
              </label>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              >
                <option value="newest">Najnovije</option>
                <option value="oldest">Najstarije</option>
                <option value="priceAsc">Cena rastuće</option>
                <option value="priceDesc">Cena opadajuće</option>
                <option value="titleAsc">Naziv A-Z</option>
                <option value="titleDesc">Naziv Z-A</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Reset filtera
              </button>
            </div>

            <div className="flex items-end md:col-span-2">
              <div className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                Ukupno pronađenih putovanja:{" "}
                <span className="font-semibold text-white">
                  {pagination.total}
                </span>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <p className="text-slate-300">Učitavanje putovanja...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white">Greška</h2>
            <p className="mt-2 text-red-200">{error}</p>
          </div>
        ) : travels.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white">Nema rezultata</h2>
            <p className="mt-2 text-slate-300">
              Nije pronađeno nijedno putovanje za zadate kriterijume.
            </p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {travels.map((travel) => {
                const imageSrc = travel.imageUrl
                  ? `${process.env.NEXT_PUBLIC_API_URL}${travel.imageUrl}`
                  : null;

                return (
                  <article
                    key={travel._id}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg"
                  >
                    <div className="h-52 w-full bg-slate-800">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={travel.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          Nema slike
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
                          {travel.destination?.name || "Nepoznata destinacija"}
                        </span>

                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                          {travel.destination?.country || "Nema države"}
                        </span>
                      </div>

                      <h2 className="text-xl font-bold text-white">
                        {travel.title}
                      </h2>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">
                        {travel.description || "Opis nije dostupan."}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Cena
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {formatPrice(travel.price)}
                          </p>
                        </div>

                        <Link
                          href={`/travels/${travel.slug}`}
                          className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                        >
                          Detalji
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg md:flex-row">
              <div className="text-sm text-slate-300">
                Strana{" "}
                <span className="font-semibold text-white">
                  {pagination.page}
                </span>{" "}
                od{" "}
                <span className="font-semibold text-white">
                  {pagination.pages}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prethodna
                </button>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, pagination.pages))
                  }
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sledeća
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

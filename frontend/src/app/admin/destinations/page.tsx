"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UserRole = "PUTNIK" | "OPERATOR";

type MeResponse = {
  user: {
    id: string;
    name?: string;
    email: string;
    role: UserRole;
    emailVerified: boolean;
  };
};

type Destination = {
  _id: string;
  name: string;
  country: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

type DestinationsResponse = {
  destinations: Destination[];
  message?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Nema podatka";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nema podatka";

  return date.toLocaleString("sr-RS");
}

export default function AdminDestinationsPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingDestinationId, setEditingDestinationId] = useState<
    string | null
  >(null);
  const [savingDestinationId, setSavingDestinationId] = useState<string | null>(
    null,
  );
  const [deletingDestinationId, setDeletingDestinationId] = useState<
    string | null
  >(null);

  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [createName, setCreateName] = useState("");
  const [createCountry, setCreateCountry] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creatingDestination, setCreatingDestination] = useState(false);

  async function loadDestinations() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/destinations`,
      {
        credentials: "include",
      },
    );

    const data: DestinationsResponse = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || "Greška pri učitavanju destinacija.");
    }

    setDestinations(data.destinations || []);
  }

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
          {
            credentials: "include",
          },
        );

        const meData = await meRes.json();

        if (!meRes.ok) {
          throw new Error(
            meData?.message || "Greška pri učitavanju korisnika.",
          );
        }

        if (meData.user.role !== "OPERATOR") {
          throw new Error("Nemate pristup upravljanju destinacijama.");
        }

        setMe(meData.user);

        await loadDestinations();
        setPageError(null);
      } catch (err) {
        setPageError(
          err instanceof Error ? err.message : "Došlo je do nepoznate greške.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function startEditing(destination: Destination) {
    setEditingDestinationId(destination._id);
    setEditName(destination.name || "");
    setEditCountry(destination.country || "");
    setEditDescription(destination.description || "");
    setActionMsg(null);
    setActionError(null);
  }

  function cancelEditing() {
    setEditingDestinationId(null);
    setEditName("");
    setEditCountry("");
    setEditDescription("");
  }

  async function handleCreateDestination(e: React.FormEvent) {
    e.preventDefault();

    setActionMsg(null);
    setActionError(null);

    if (!createName.trim() || !createCountry.trim()) {
      setActionError("Naziv i država su obavezni.");
      return;
    }

    setCreatingDestination(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/destinations`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: createName.trim(),
            country: createCountry.trim(),
            description: createDescription.trim(),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Kreiranje destinacije nije uspelo.");
      }

      setCreateName("");
      setCreateCountry("");
      setCreateDescription("");
      setActionMsg("Destinacija je uspešno kreirana.");
      await loadDestinations();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri kreiranju destinacije.",
      );
    } finally {
      setCreatingDestination(false);
    }
  }

  async function handleSaveDestination(destinationId: string) {
    setActionMsg(null);
    setActionError(null);

    if (!editName.trim() || !editCountry.trim()) {
      setActionError("Naziv i država su obavezni.");
      return;
    }

    setSavingDestinationId(destinationId);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/destinations/${destinationId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editName.trim(),
            country: editCountry.trim(),
            description: editDescription.trim(),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Izmena destinacije nije uspela.");
      }

      setActionMsg("Destinacija je uspešno ažurirana.");
      cancelEditing();
      await loadDestinations();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri izmeni destinacije.",
      );
    } finally {
      setSavingDestinationId(null);
    }
  }

  async function handleDeleteDestination(destinationId: string) {
    const confirmed = window.confirm(
      "Da li si siguran da želiš da obrišeš ovu destinaciju?",
    );

    if (!confirmed) return;

    setActionMsg(null);
    setActionError(null);
    setDeletingDestinationId(destinationId);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/destinations/${destinationId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Brisanje destinacije nije uspelo.");
      }

      if (editingDestinationId === destinationId) {
        cancelEditing();
      }

      setActionMsg("Destinacija je uspešno obrisana.");
      setDestinations((prev) =>
        prev.filter((item) => item._id !== destinationId),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri brisanju destinacije.",
      );
    } finally {
      setDeletingDestinationId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          Učitavanje upravljanja destinacijama...
        </div>
      </main>
    );
  }

  if (pageError || !me) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-white">Pristup odbijen</h1>
          <p className="mt-2 text-red-200">
            {pageError || "Nemate pristup ovoj stranici."}
          </p>

          <div className="mt-4">
            <Link
              href="/travels"
              className="inline-block rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Nazad na ponudu
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl border border-cyan-500/20 bg-linear-to-br from-cyan-600/20 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
                Upravljanje destinacijama
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white">
                Dodavanje, izmena i brisanje destinacija
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Operator može da kreira nove destinacije, izmeni postojeće
                podatke i obriše destinacije iz sistema.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/travels"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Javna putovanja
              </Link>

              <Link
                href="/admin"
                className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 font-medium text-purple-200 transition hover:bg-purple-500/20"
              >
                Admin panel
              </Link>

              <Link
                href="/admin/travels"
                className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 font-medium text-blue-200 transition hover:bg-blue-500/20"
              >
                Putovanja
              </Link>

              <Link
                href="/admin/logs"
                className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 font-medium text-indigo-200 transition hover:bg-indigo-500/20"
              >
                Logovi
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-200">
              OPERATOR pristup
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200">
              Ukupno destinacija: {destinations.length}
            </span>
          </div>
        </section>

        {actionMsg ? (
          <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            {actionMsg}
          </div>
        ) : null}

        {actionError ? (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {actionError}
          </div>
        ) : null}

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">
              Dodaj novu destinaciju
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Kreiranje nove destinacije dostupno je samo operatoru.
            </p>
          </div>

          <form onSubmit={handleCreateDestination} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Naziv destinacije
                </label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Pariz"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Država
                </label>
                <input
                  value={createCountry}
                  onChange={(e) => setCreateCountry(e.target.value)}
                  placeholder="Francuska"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Opis
              </label>
              <textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Kratak opis destinacije"
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={creatingDestination}
              className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingDestination ? "Kreiranje..." : "Dodaj destinaciju"}
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {destinations.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white">
                Nema kreiranih destinacija
              </h2>
              <p className="mt-2 text-slate-300">
                Dodaj prvu destinaciju koristeći formu iznad.
              </p>
            </div>
          ) : (
            destinations.map((destination) => {
              const isEditing = editingDestinationId === destination._id;

              return (
                <article
                  key={destination._id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg"
                >
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {destination.name}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Upravljanje postojećom destinacijom.
                        </p>
                      </div>

                      {!isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(destination)}
                            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                          >
                            Izmeni
                          </button>

                          <button
                            type="button"
                            disabled={deletingDestinationId === destination._id}
                            onClick={() =>
                              handleDeleteDestination(destination._id)
                            }
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                          >
                            {deletingDestinationId === destination._id
                              ? "Brisanje..."
                              : "Obriši"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200"
                          >
                            Otkaži
                          </button>

                          <button
                            type="button"
                            disabled={savingDestinationId === destination._id}
                            onClick={() =>
                              handleSaveDestination(destination._id)
                            }
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 disabled:opacity-60"
                          >
                            {savingDestinationId === destination._id
                              ? "Čuvanje..."
                              : "Sačuvaj izmene"}
                          </button>
                        </div>
                      )}
                    </div>

                    {!isEditing ? (
                      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                          <p className="mb-2 text-sm text-slate-400">
                            Opis destinacije
                          </p>
                          <p className="text-slate-200">
                            {destination.description || "Opis nije dostupan."}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                          <div className="grid gap-4">
                            <div>
                              <p className="text-sm text-slate-400">Država</p>
                              <p className="text-sm font-semibold text-white">
                                {destination.country}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-slate-400">ID</p>
                              <p className="break-all text-sm text-slate-300">
                                {destination._id}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-slate-400">
                                Poslednja izmena
                              </p>
                              <p className="text-sm text-slate-300">
                                {formatDate(destination.updatedAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                              Naziv destinacije
                            </label>
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                              Država
                            </label>
                            <input
                              value={editCountry}
                              onChange={(e) => setEditCountry(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Opis
                          </label>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={5}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

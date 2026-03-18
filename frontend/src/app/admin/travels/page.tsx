"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
};

type Travel = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  imageUrl?: string;
  destination:
    | Destination
    | {
        _id: string;
        name: string;
        country: string;
        description?: string;
      };
  createdAt?: string;
  updatedAt?: string;
};

type TravelsResponse = {
  travels: Travel[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message?: string;
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

function formatPrice(value: number) {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminTravelsPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [travels, setTravels] = useState<Travel[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [creatingTravel, setCreatingTravel] = useState(false);
  const [travelTitle, setTravelTitle] = useState("");
  const [travelDescription, setTravelDescription] = useState("");
  const [travelPrice, setTravelPrice] = useState("");
  const [travelDestinationId, setTravelDestinationId] = useState("");
  const [travelImageFile, setTravelImageFile] = useState<File | null>(null);

  const [editingTravelId, setEditingTravelId] = useState<string | null>(null);
  const [savingTravelId, setSavingTravelId] = useState<string | null>(null);
  const [deletingTravelId, setDeletingTravelId] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDestinationId, setEditDestinationId] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editCurrentImageUrl, setEditCurrentImageUrl] = useState("");

  async function loadTravels() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/travels?limit=100&sort=newest`,
      {
        credentials: "include",
      },
    );

    const data: TravelsResponse = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || "Greška pri učitavanju putovanja.");
    }

    setTravels(data.travels || []);
  }

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
          throw new Error("Nemate pristup upravljanju ponudom.");
        }

        setMe(meData.user);

        await Promise.all([loadTravels(), loadDestinations()]);
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

  const sortedDestinations = useMemo(
    () => [...destinations].sort((a, b) => a.name.localeCompare(b.name)),
    [destinations],
  );

  function startEditing(travel: Travel) {
    const destinationId =
      typeof travel.destination === "object" && travel.destination?._id
        ? travel.destination._id
        : "";

    setEditingTravelId(travel._id);
    setEditTitle(travel.title || "");
    setEditDescription(travel.description || "");
    setEditPrice(String(travel.price ?? ""));
    setEditDestinationId(destinationId);
    setEditImageFile(null);
    setEditCurrentImageUrl(travel.imageUrl || "");
    setActionMsg(null);
    setActionError(null);
  }

  function cancelEditing() {
    setEditingTravelId(null);
    setEditTitle("");
    setEditDescription("");
    setEditPrice("");
    setEditDestinationId("");
    setEditImageFile(null);
    setEditCurrentImageUrl("");
  }

  async function handleCreateTravel(e: React.FormEvent) {
    e.preventDefault();

    setActionMsg(null);
    setActionError(null);

    if (
      !travelTitle.trim() ||
      !travelPrice.trim() ||
      !travelDestinationId.trim()
    ) {
      setActionError("Naziv, cena i destinacija su obavezni.");
      return;
    }

    setCreatingTravel(true);

    try {
      const formData = new FormData();
      formData.append("title", travelTitle.trim());
      formData.append("description", travelDescription.trim());
      formData.append("price", travelPrice);
      formData.append("destination", travelDestinationId);

      if (travelImageFile) {
        formData.append("image", travelImageFile);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/travels`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Kreiranje putovanja nije uspelo.");
      }

      setTravelTitle("");
      setTravelDescription("");
      setTravelPrice("");
      setTravelDestinationId("");
      setTravelImageFile(null);
      setActionMsg("Putovanje je uspešno kreirano.");
      await loadTravels();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri kreiranju putovanja.",
      );
    } finally {
      setCreatingTravel(false);
    }
  }

  async function handleSaveTravel(travelId: string) {
    setActionMsg(null);
    setActionError(null);

    if (!editTitle.trim() || !editPrice.trim() || !editDestinationId.trim()) {
      setActionError("Naziv, cena i destinacija su obavezni.");
      return;
    }

    setSavingTravelId(travelId);

    try {
      const formData = new FormData();
      formData.append("title", editTitle.trim());
      formData.append("description", editDescription.trim());
      formData.append("price", editPrice);
      formData.append("destination", editDestinationId);

      if (editImageFile) {
        formData.append("image", editImageFile);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/travels/${travelId}`,
        {
          method: "PUT",
          credentials: "include",
          body: formData,
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Izmena putovanja nije uspela.");
      }

      setActionMsg("Putovanje je uspešno ažurirano.");
      cancelEditing();
      await loadTravels();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri izmeni putovanja.",
      );
    } finally {
      setSavingTravelId(null);
    }
  }

  async function handleDeleteTravel(travelId: string) {
    const confirmed = window.confirm(
      "Da li si siguran da želiš da obrišeš ovo putovanje?",
    );

    if (!confirmed) return;

    setActionMsg(null);
    setActionError(null);
    setDeletingTravelId(travelId);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/travels/${travelId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Brisanje putovanja nije uspelo.");
      }

      if (editingTravelId === travelId) {
        cancelEditing();
      }

      setActionMsg("Putovanje je uspešno obrisano.");
      setTravels((prev) => prev.filter((item) => item._id !== travelId));
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri brisanju putovanja.",
      );
    } finally {
      setDeletingTravelId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          Učitavanje upravljanja ponudom...
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
        <section className="mb-6 rounded-3xl border border-blue-500/20 bg-linear-to-br from-blue-600/20 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
                Upravljanje ponudom
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white">
                Dodavanje, izmena i brisanje putovanja
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Operator može da kreira nova putovanja, izmeni podatke, promeni
                destinaciju, zameni naslovnu sliku i obriše postojeću ponudu.
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
                href="/admin/destinations"
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 font-medium text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Destinacije
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
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-200">
              OPERATOR pristup
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200">
              Ukupno putovanja: {travels.length}
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
              Dodaj novo putovanje
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Putovanje mora imati naziv, cenu i povezanu destinaciju.
            </p>
          </div>

          <form onSubmit={handleCreateTravel} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Naziv putovanja
              </label>
              <input
                value={travelTitle}
                onChange={(e) => setTravelTitle(e.target.value)}
                placeholder="Pariz vikend"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Opis
              </label>
              <textarea
                value={travelDescription}
                onChange={(e) => setTravelDescription(e.target.value)}
                placeholder="Opis putovanja"
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Cena
                </label>
                <input
                  type="number"
                  min="0"
                  value={travelPrice}
                  onChange={(e) => setTravelPrice(e.target.value)}
                  placeholder="10000"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Destinacija
                </label>
                <select
                  value={travelDestinationId}
                  onChange={(e) => setTravelDestinationId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                >
                  <option value="">Izaberi destinaciju</option>
                  {sortedDestinations.map((destination) => (
                    <option key={destination._id} value={destination._id}>
                      {destination.name} ({destination.country})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Naslovna slika
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setTravelImageFile(file);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-200 hover:file:bg-blue-500/30"
              />
              <p className="mt-2 text-xs text-slate-500">
                Dozvoljene su samo slike, maksimalno 5 MB.
              </p>
            </div>

            <button
              type="submit"
              disabled={creatingTravel}
              className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 font-semibold text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingTravel ? "Kreiranje..." : "Dodaj putovanje"}
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {travels.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white">
                Nema kreiranih putovanja
              </h2>
              <p className="mt-2 text-slate-300">
                Dodaj prvo putovanje koristeći formu iznad.
              </p>
            </div>
          ) : (
            travels.map((travel) => {
              const isEditing = editingTravelId === travel._id;
              const imageSrc = travel.imageUrl
                ? `${process.env.NEXT_PUBLIC_API_URL}${travel.imageUrl}`
                : null;

              const destinationName =
                typeof travel.destination === "object"
                  ? travel.destination?.name
                  : "Nepoznata destinacija";

              const destinationCountry =
                typeof travel.destination === "object"
                  ? travel.destination?.country
                  : "Nema države";

              return (
                <article
                  key={travel._id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg"
                >
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {travel.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Upravljanje postojećom ponudom.
                        </p>
                      </div>

                      {!isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(travel)}
                            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                          >
                            Izmeni
                          </button>

                          <button
                            type="button"
                            disabled={deletingTravelId === travel._id}
                            onClick={() => handleDeleteTravel(travel._id)}
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                          >
                            {deletingTravelId === travel._id
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
                            disabled={savingTravelId === travel._id}
                            onClick={() => handleSaveTravel(travel._id)}
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200"
                          >
                            {savingTravelId === travel._id
                              ? "Čuvanje..."
                              : "Sačuvaj izmene"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-[420px_minmax(0,1fr)]">
                      <div className="h-64 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={travel.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-500">
                            Nema slike
                          </div>
                        )}
                      </div>

                      <div className="h-64 rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                        <div className="grid h-full content-start gap-4">
                          <div>
                            <p className="text-sm text-slate-400">Slug</p>
                            <p className="text-sm font-semibold text-white">
                              {travel.slug}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-slate-400">
                              Destinacija
                            </p>
                            <p className="text-sm font-semibold text-white">
                              {destinationName} ({destinationCountry})
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-slate-400">Cena</p>
                            <p className="text-xl font-bold text-white">
                              {formatPrice(travel.price)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-slate-400">
                              Poslednja izmena
                            </p>
                            <p className="text-sm text-slate-300">
                              {formatDate(travel.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isEditing ? (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                        <p className="mb-2 text-sm text-slate-400">
                          Opis putovanja
                        </p>
                        <p className="text-slate-200">
                          {travel.description || "Opis nije dostupan."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Naziv putovanja
                          </label>
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                          />
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

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                              Cena
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                              Destinacija
                            </label>
                            <select
                              value={editDestinationId}
                              onChange={(e) =>
                                setEditDestinationId(e.target.value)
                              }
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                            >
                              <option value="">Izaberi destinaciju</option>
                              {sortedDestinations.map((destination) => (
                                <option
                                  key={destination._id}
                                  value={destination._id}
                                >
                                  {destination.name} ({destination.country})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Nova naslovna slika
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setEditImageFile(file);
                            }}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-200 hover:file:bg-blue-500/30"
                          />
                          <p className="mt-2 text-xs text-slate-500">
                            Opciono. Ako ne izabereš novu sliku, ostaje
                            postojeća.
                          </p>
                        </div>

                        {editImageFile ? (
                          <p className="text-sm text-slate-400">
                            Izabrana slika: {editImageFile.name}
                          </p>
                        ) : editCurrentImageUrl ? (
                          <p className="text-sm text-slate-400">
                            Trenutna slika je zadržana.
                          </p>
                        ) : null}
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

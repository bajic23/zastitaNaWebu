"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UserRole = "PUTNIK" | "OPERATOR";

type UserItem = {
  _id?: string;
  id?: string;
  name?: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
};

type MeResponse = {
  user: {
    id: string;
    name?: string;
    email: string;
    role: UserRole;
    emailVerified: boolean;
    hasGoogleAccount?: boolean;
  };
};

type UsersResponse = {
  users: UserItem[];
};

type Destination = {
  _id: string;
  name: string;
  country: string;
  description?: string;
};

type DestinationsResponse = {
  destinations: Destination[];
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
};

function formatDate(value?: string | null) {
  if (!value) return "Nema podatka";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nema podatka";

  return date.toLocaleString("sr-RS");
}

export default function AdminPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [travels, setTravels] = useState<Travel[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  async function loadUsers() {
    const usersRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`,
      {
        credentials: "include",
      },
    );

    const usersData: UsersResponse = await usersRes.json();

    if (!usersRes.ok) {
      throw new Error("Greška pri učitavanju korisnika.");
    }

    setUsers(usersData.users || []);
  }

  async function loadDestinations() {
    const destinationsRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/destinations`,
      {
        credentials: "include",
      },
    );

    const destinationsData: DestinationsResponse = await destinationsRes.json();

    if (!destinationsRes.ok) {
      throw new Error("Greška pri učitavanju destinacija.");
    }

    setDestinations(destinationsData.destinations || []);
  }

  async function loadTravels() {
    const travelsRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/travels?limit=100&sort=newest`,
      {
        credentials: "include",
      },
    );

    const travelsData: TravelsResponse = await travelsRes.json();

    if (!travelsRes.ok) {
      throw new Error("Greška pri učitavanju putovanja.");
    }

    setTravels(travelsData.travels || []);
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
          throw new Error("Nemate pristup operator panelu.");
        }

        setMe(meData.user);

        await Promise.all([loadUsers(), loadDestinations(), loadTravels()]);
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

  async function deleteUser(userId: string) {
    const confirmed = window.confirm(
      "Da li si siguran da želiš da obrišeš ovog putnika?",
    );

    if (!confirmed) return;

    setDeletingUserId(userId);
    setActionMsg(null);
    setActionError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Brisanje korisnika nije uspelo.");
      }

      setUsers((prev) =>
        prev.filter((user) => (user._id || user.id) !== userId),
      );
      setActionMsg("Putnik je uspešno obrisan.");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri brisanju korisnika.",
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  const totalUsers = useMemo(() => users.length, [users]);
  const totalVerifiedUsers = useMemo(
    () => users.filter((user) => user.emailVerified).length,
    [users],
  );
  const totalDestinations = useMemo(() => destinations.length, [destinations]);
  const totalTravels = useMemo(() => travels.length, [travels]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          Učitavanje operator panela...
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
              Nazad na putovanja
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl border border-purple-500/20 bg-linear-to-br from-purple-600/20 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-purple-300">
                Operator panel
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white">
                Upravljanje sistemom putovanja
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Operator može da upravlja putovanjima, destinacijama, pristupnim
                logovima i korisnicima iz jednog preglednog panela.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/travels"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Lista putovanja
              </Link>

              <Link
                href="/admin/travels"
                className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 font-medium text-blue-200 transition hover:bg-blue-500/20"
              >
                Upravljanje putovanjima
              </Link>

              <Link
                href="/admin/destinations"
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 font-medium text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Upravljanje destinacijama
              </Link>

              <Link
                href="/admin/logs"
                className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 font-medium text-indigo-200 transition hover:bg-indigo-500/20"
              >
                Pristupni logovi
              </Link>

              <Link
                href="/logout"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Logout
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm font-medium text-purple-200">
              OPERATOR pristup
            </span>
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-medium text-green-200">
              {me.emailVerified ? "Email verified" : "Email not verified"}
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

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Ukupno putovanja</p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {totalTravels}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Aktivne ponude u sistemu.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Ukupno destinacija</p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {totalDestinations}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Dostupne destinacije za ponude.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Ukupno putnika</p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {totalUsers}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Korisnici sa putnik rolom.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Verifikovani putnici</p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {totalVerifiedUsers}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Korisnici sa potvrđenim emailom.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">Svi putnici</h2>
            <p className="mt-1 text-sm text-slate-400">
              Operator vidi samo PUTNIKE i može da obriše njihov nalog.
            </p>
          </div>

          {users.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
              <p className="text-slate-300">Nema korisnika za prikaz.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Ime
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Rola
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Verifikovan
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Poslednji login
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Akcije
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const userId = user._id || user.id || "";
                    const isMe = userId === me.id;
                    const canDelete = !isMe;

                    return (
                      <tr
                        key={userId}
                        className="rounded-2xl border border-slate-800 bg-slate-950/40"
                      >
                        <td className="rounded-l-2xl px-4 py-4 text-sm font-medium text-white">
                          {user.name || "Nema imena"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-200">
                          {user.email}
                        </td>

                        <td className="px-4 py-4 text-sm">
                          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                            {user.role}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm">
                          <span
                            className={
                              user.emailVerified
                                ? "font-medium text-emerald-300"
                                : "font-medium text-amber-300"
                            }
                          >
                            {user.emailVerified ? "Da" : "Ne"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-300">
                          {formatDate(user.lastLoginAt)}
                        </td>

                        <td className="rounded-r-2xl px-4 py-4">
                          {canDelete ? (
                            <button
                              type="button"
                              disabled={deletingUserId === userId}
                              onClick={() => deleteUser(userId)}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingUserId === userId
                                ? "Brisanje..."
                                : "Obriši"}
                            </button>
                          ) : (
                            <span className="text-sm text-slate-500">
                              Trenutni operator
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

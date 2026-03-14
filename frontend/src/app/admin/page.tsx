"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UserItem = {
  _id?: string;
  id?: string;
  name?: string;
  email: string;
  role: "USER" | "MANAGER" | "ADMIN";
  emailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
};

type MeResponse = {
  user: {
    id: string;
    name?: string;
    email: string;
    role: "USER" | "MANAGER" | "ADMIN";
    emailVerified: boolean;
    hasGoogleAccount?: boolean;
  };
};

type UsersResponse = {
  users: UserItem[];
};

function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function formatDate(value?: string | null) {
  if (!value) return "Nema podatka";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Nema podatka";

  return date.toLocaleString("sr-RS");
}

export default function AdminPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = getCookie("access_token");

    if (!token) {
      setPageError("Niste ulogovani.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const meRes = await fetch("http://localhost:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const meData = await meRes.json();

        if (!meRes.ok) {
          throw new Error(
            meData?.message || "Greška pri učitavanju korisnika.",
          );
        }

        if (meData.user.role !== "ADMIN") {
          throw new Error("Nemate pristup admin panelu.");
        }

        setMe(meData.user);

        const usersRes = await fetch("http://localhost:5000/api/admin/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const usersData: UsersResponse = await usersRes.json();

        if (!usersRes.ok) {
          throw new Error("Greška pri učitavanju korisnika.");
        }

        setUsers(usersData.users || []);
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

  async function updateRole(
    userId: string,
    role: "USER" | "MANAGER" | "ADMIN",
  ) {
    const token = getCookie("access_token");

    if (!token) {
      setActionMsg("Nedostaje token.");
      return;
    }

    setSavingUserId(userId);
    setActionMsg(null);

    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/users/${userId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Promena role nije uspela.");
      }

      setUsers((prev) =>
        prev.map((user) =>
          (user._id || user.id) === userId ? { ...user, role } : user,
        ),
      );

      setActionMsg("Rola je uspešno promenjena.");
    } catch (err) {
      setActionMsg(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri izmeni role.",
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function deleteUser(userId: string) {
    const token = getCookie("access_token");

    if (!token) {
      setActionMsg("Nedostaje token.");
      return;
    }

    const confirmed = window.confirm(
      "Da li si siguran da želiš da obrišeš ovog korisnika?",
    );

    if (!confirmed) return;

    setDeletingUserId(userId);
    setActionMsg(null);

    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Brisanje korisnika nije uspelo.");
      }

      setUsers((prev) =>
        prev.filter((user) => (user._id || user.id) !== userId),
      );

      setActionMsg("Korisnik je uspešno obrisan.");
    } catch (err) {
      setActionMsg(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri brisanju korisnika.",
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  function handleRoleChange(
    userId: string,
    newRole: "USER" | "MANAGER" | "ADMIN",
  ) {
    setUsers((prev) =>
      prev.map((user) =>
        (user._id || user.id) === userId ? { ...user, role: newRole } : user,
      ),
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          Učitavanje admin panela...
        </div>
      </main>
    );
  }

  if (pageError || !me) {
    return (
      <main className="min-h-screen px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-white">Pristup odbijen</h1>
          <p className="mt-2 text-red-200">
            {pageError || "Nemate pristup ovoj stranici."}
          </p>

          <div className="mt-4">
            <Link
              href="/dashboard"
              className="inline-block rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Nazad na dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl border border-purple-500/20 bg-linear-to-br from-purple-600/20 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-purple-300">
                Admin panel
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white">
                Upravljanje korisnicima
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Ovde administrator može da vidi sve korisnike sistema, menja
                njihove role i briše naloge koji nisu admin.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Nazad
              </Link>

              <Link
                href="/logs"
                className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 font-medium text-blue-200 transition hover:bg-blue-500/20"
              >
                Pogledaj logove
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm font-medium text-purple-200">
              ADMIN pristup
            </span>
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-medium text-green-200">
              {me.emailVerified ? "Email verified" : "Email not verified"}
            </span>
          </div>
        </section>

        {actionMsg ? (
          <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
            {actionMsg}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">Svi korisnici</h2>
            <p className="mt-1 text-sm text-slate-400">
              Pregled korisnika, promena role i kontrola brisanja naloga.
            </p>
          </div>

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
                    Trenutna rola
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
                  const isAdminUser = user.role === "ADMIN";
                  const canDelete = !isMe && !isAdminUser;

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
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.role === "ADMIN"
                              ? "border border-purple-500/30 bg-purple-500/10 text-purple-200"
                              : user.role === "MANAGER"
                                ? "border border-amber-500/30 bg-amber-500/10 text-amber-200"
                                : "border border-blue-500/30 bg-blue-500/10 text-blue-200"
                          }`}
                        >
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
                        <div className="flex flex-col gap-2 md:flex-row">
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(
                                userId,
                                e.target.value as "USER" | "MANAGER" | "ADMIN",
                              )
                            }
                            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                          >
                            <option value="USER">USER</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>

                          <button
                            type="button"
                            disabled={savingUserId === userId}
                            onClick={() => updateRole(userId, user.role)}
                            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingUserId === userId ? "Čuvanje..." : "Sačuvaj"}
                          </button>

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
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

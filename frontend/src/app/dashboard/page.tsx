"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UserRole = "PUTNIK" | "OPERATOR";

type LoginHistoryItem = {
  at?: string;
  ip?: string;
  userAgent?: string;
};

type MeResponse = {
  user: {
    id: string;
    name?: string;
    email: string;
    role: UserRole;
    emailVerified: boolean;
    lastLoginAt?: string | null;
    loginHistory?: LoginHistoryItem[];
    hasGoogleAccount?: boolean;
  };
};

function formatDate(value?: string | null) {
  if (!value) return "Nema podatka";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nema podatka";

  return date.toLocaleString("sr-RS");
}

export default function DashboardPage() {
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
          {
            credentials: "include",
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Greška pri učitavanju korisnika.");
        }

        setUser(data.user);
        setEditName(data.user.name || "");
        setEditEmail(data.user.email || "");
        setError(null);
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

  const authMethod = useMemo(() => {
    if (!user) return "-";
    return user.hasGoogleAccount ? "Google OAuth" : "Email + password";
  }, [user]);

  const roleText = useMemo(() => {
    if (!user) return "";

    if (user.role === "OPERATOR") {
      return "Operator upravlja putnicima, destinacijama, putovanjima i pristupnim logovima.";
    }

    return "Putnik ima pristup svom profilu i javnom pregledu putovanja.";
  }, [user]);

  const activityItems = useMemo(() => {
    if (!user?.loginHistory?.length) return [];
    return user.loginHistory.slice(-3).reverse();
  }, [user]);

  async function handleProfileSave() {
    if (!editName.trim() || !editEmail.trim()) {
      setProfileError("Ime i email su obavezni.");
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileMsg(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: editName.trim(),
            email: editEmail.trim(),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Izmena profila nije uspela.");
      }

      setUser(data.user);
      setEditName(data.user.name || "");
      setEditEmail(data.user.email || "");
      setIsEditing(false);
      setProfileMsg("Profil je uspešno ažuriran.");
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Došlo je do greške pri čuvanju.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleDeleteProfile() {
    const confirmed = window.confirm(
      "Da li sigurno želiš da obrišeš svoj profil? Ova akcija je nepovratna.",
    );

    if (!confirmed) return;

    setDeletingProfile(true);
    setProfileError(null);
    setProfileMsg(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Brisanje profila nije uspelo.");
      }

      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    } catch (err) {
      setProfileError(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri brisanju profila.",
      );
    } finally {
      setDeletingProfile(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <p className="text-slate-300">Učitavanje dashboard-a...</p>
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-white">Greška</h1>
          <p className="mt-2 text-red-200">
            {error || "Korisnik nije pronađen."}
          </p>

          <div className="mt-4">
            <Link
              href="/login"
              className="inline-block rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Idi na login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">ZaštitaNaWebu</h1>
            <p className="text-sm text-slate-400">Korisnički dashboard</p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-sm font-semibold text-white">
              {user.name || user.email}
            </p>
            <p className="text-sm text-slate-400">Rola: {user.role}</p>
          </div>
        </header>

        <section className="mb-6 rounded-3xl border border-blue-500/20 bg-linear-to-br from-blue-600/20 to-slate-900 p-6 shadow-xl">
          <h2 className="mb-3 text-3xl font-extrabold text-white">
            {user.role === "OPERATOR"
              ? "Dobrodošao na operator dashboard"
              : "Dobrodošao na svoj dashboard"}
          </h2>

          <p className="max-w-3xl text-slate-300">{roleText}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                user.emailVerified
                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              {user.emailVerified
                ? "Email verifikovan"
                : "Email nije verifikovan"}
            </span>

            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300">
              {authMethod}
            </span>

            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200">
              Protected route
            </span>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Rola</p>
            <p className="mt-2 text-2xl font-bold text-white">{user.role}</p>
            <p className="mt-2 text-sm text-slate-300">{roleText}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Status naloga</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {user.emailVerified ? "Aktivan" : "Na čekanju"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {user.emailVerified
                ? "Nalog je uspešno verifikovan."
                : "Potrebna je verifikacija email adrese."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Način prijave</p>
            <p className="mt-2 text-2xl font-bold text-white">{authMethod}</p>
            <p className="mt-2 text-sm text-slate-300">
              Prikaz aktivnog auth mehanizma korisnika.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Poslednja prijava</p>
            <p className="mt-2 text-lg font-bold text-white">
              {formatDate(user.lastLoginAt)}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Poslednja zabeležena aktivnost korisnika.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg lg:col-span-2">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-xl font-bold text-white">Pregled profila</h3>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setProfileMsg(null);
                    setProfileError(null);
                    setEditName(user.name || "");
                    setEditEmail(user.email || "");
                    setIsEditing(true);
                  }}
                  className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                >
                  Izmeni profil
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileMsg(null);
                      setProfileError(null);
                      setEditName(user.name || "");
                      setEditEmail(user.email || "");
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
                  >
                    Otkaži
                  </button>

                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={handleProfileSave}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? "Čuvanje..." : "Sačuvaj"}
                  </button>
                </div>
              )}
            </div>

            {profileMsg ? (
              <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                {profileMsg}
              </div>
            ) : null}

            {profileError ? (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {profileError}
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="flex flex-col gap-2 border-b border-slate-800 pb-3 md:flex-row md:items-center md:justify-between">
                <span className="text-sm text-slate-400">Ime</span>

                {isEditing ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 md:w-80"
                  />
                ) : (
                  <span className="text-sm font-semibold text-white">
                    {user.name || "Nema imena"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 border-b border-slate-800 pb-3 md:flex-row md:items-center md:justify-between">
                <span className="text-sm text-slate-400">Email</span>

                {isEditing ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 md:w-80"
                  />
                ) : (
                  <span className="text-sm font-semibold text-white">
                    {user.email}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">Rola</span>
                <span className="text-sm font-semibold text-white">
                  {user.role}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">Email status</span>
                <span
                  className={`text-sm font-semibold ${
                    user.emailVerified ? "text-emerald-300" : "text-amber-300"
                  }`}
                >
                  {user.emailVerified ? "Verified" : "Not verified"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">Način prijave</span>
                <span className="text-sm font-semibold text-white">
                  {authMethod}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Poslednji login</span>
                <span className="text-sm font-semibold text-white">
                  {formatDate(user.lastLoginAt)}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-semibold text-white">
                  Poslednje prijave
                </h4>
              </div>

              <div className="space-y-3">
                {activityItems.length > 0 ? (
                  activityItems.map((item, index) => (
                    <div
                      key={`${item.at || "login"}-${index}`}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <p className="text-sm font-semibold text-white">
                        Uspešna prijava na sistem
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatDate(item.at)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        IP: {item.ip || "Nema podatka"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-sm font-semibold text-white">
                      Nema istorije prijava
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Login history još nije dostupna.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <h3 className="mb-5 text-xl font-bold text-white">Brze akcije</h3>

            <div className="space-y-3">
              <Link
                href="/travels"
                className="block rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-center font-medium text-blue-200 transition hover:bg-blue-500/20"
              >
                Pregled svih putovanja
              </Link>

              {user.role === "OPERATOR" ? (
                <>
                  <Link
                    href="/admin"
                    className="block rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-center font-medium text-purple-200 transition hover:bg-purple-500/20"
                  >
                    Upravljanje putnicima
                  </Link>

                  <Link
                    href="/logs"
                    className="block rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center font-medium text-amber-200 transition hover:bg-amber-500/20"
                  >
                    Pristupni logovi
                  </Link>
                </>
              ) : null}

              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={deletingProfile}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingProfile ? "Brisanje profila..." : "Obriši moj profil"}
              </button>

              <Link
                href="/logout"
                className="block rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center font-medium text-slate-200 transition hover:bg-slate-700"
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

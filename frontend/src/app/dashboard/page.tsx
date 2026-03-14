"use client";

import { useEffect, useMemo, useState } from "react";

type MeResponse = {
  user: {
    id: string;
    name?: string;
    email: string;
    role: "USER" | "MANAGER" | "ADMIN";
    emailVerified: boolean;
    lastLoginAt?: string | null;
    loginHistory?: Array<{
      createdAt?: string;
      timestamp?: string;
      at?: string;
      ip?: string;
      userAgent?: string;
    }>;
    hasGoogleAccount?: boolean;
  };
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

    if (user.role === "ADMIN") {
      return "Administrator ima pristup admin funkcijama i upravljanju sistemom.";
    }

    if (user.role === "MANAGER") {
      return "Manager ima pristup logovima i proširenim zaštićenim sadržajima.";
    }

    return "Korisnik ima pristup standardnim zaštićenim rutama i sadržaju.";
  }, [user]);

  const activityItems = useMemo(() => {
    if (!user?.loginHistory?.length) return [];
    return user.loginHistory.slice(0, 3);
  }, [user]);

  async function handleProfileSave() {
    const token = getCookie("access_token");

    if (!token) {
      setProfileError("Nedostaje token.");
      return;
    }

    if (!editName.trim() || !editEmail.trim()) {
      setProfileError("Ime i email su obavezni.");
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileMsg(null);

    try {
      const res = await fetch("http://localhost:5000/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
        }),
      });

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

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <p className="text-slate-300">Učitavanje dashboard-a...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 shadow-lg">
            <h1 className="text-2xl font-bold text-white">Greška</h1>
            <p className="mt-2 text-red-200">
              {error || "Korisnik nije pronađen."}
            </p>

            <div className="mt-4">
              <a
                href="/login"
                className="inline-block rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Idi na login
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">ZaštitaNaWebu</h1>
            <p className="text-sm text-slate-400">Security dashboard</p>
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
            {user.role === "ADMIN"
              ? "Dobrodošao na admin dashboard"
              : user.role === "MANAGER"
                ? "Dobrodošao na manager dashboard"
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
                ? "Nalog je uspešno verifikovan"
                : "Potrebna je verifikacija email adrese"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Način prijave</p>
            <p className="mt-2 text-2xl font-bold text-white">{authMethod}</p>
            <p className="mt-2 text-sm text-slate-300">
              Prikaz stvarnog auth mehanizma korisnika
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Poslednja prijava</p>
            <p className="mt-2 text-lg font-bold text-white">
              {formatDate(user.lastLoginAt)}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Poslednja evidentirana aktivnost
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg lg:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
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
                <div className="flex gap-2">
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
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">Ime</span>

                {isEditing ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-70 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500"
                  />
                ) : (
                  <span className="text-sm font-semibold text-white">
                    {user.name || "Nema imena"}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm text-slate-400">Email</span>

                {isEditing ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-70 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500"
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

            <div className="mt-6 space-y-3">
              {activityItems.length > 0 ? (
                activityItems.map((item, index) => {
                  const time =
                    item.createdAt || item.timestamp || item.at || null;

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <p className="text-sm font-semibold text-white">
                        Uspešna prijava na sistem
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatDate(time)}
                      </p>
                    </div>
                  );
                })
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

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <h3 className="mb-5 text-xl font-bold text-white">Brze akcije</h3>

            <div className="space-y-3">
              <a
                href="/content/1"
                className="block rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-center font-medium text-blue-200 transition hover:bg-blue-500/20"
              >
                Opšti sadržaj (USER / MANAGER / ADMIN)
              </a>

              {(user.role === "MANAGER" || user.role === "ADMIN") && (
                <a
                  href="/content/4"
                  className="block rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center font-medium text-amber-200 transition hover:bg-amber-500/20"
                >
                  Manager dokument
                </a>
              )}

              {user.role === "ADMIN" && (
                <a
                  href="/content/3"
                  className="block rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-center font-medium text-purple-200 transition hover:bg-purple-500/20"
                >
                  Admin dokument
                </a>
              )}

              {user.role === "ADMIN" && (
                <a
                  href="/admin"
                  className="block rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-center font-medium text-purple-200 transition hover:bg-purple-500/20"
                >
                  Idi na Admin panel
                </a>
              )}

              {user.role === "MANAGER" && (
                <a
                  href="/manager"
                  className="block rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center font-medium text-amber-200 transition hover:bg-amber-500/20"
                >
                  Idi na Manager panel
                </a>
              )}

              <a
                href="/logout"
                className="block rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Logout
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

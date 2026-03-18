"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UserRole = "PUTNIK" | "OPERATOR";

type LoginHistoryItem = {
  at?: string;
  ip?: string;
  userAgent?: string;
};

type MeUser = {
  id: string;
  name?: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  lastLoginAt?: string | null;
  loginHistory?: LoginHistoryItem[];
  hasGoogleAccount?: boolean;
};

type MeResponse = {
  user?: MeUser;
  message?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Nema podatka";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nema podatka";

  return date.toLocaleString("sr-RS");
}

export default function ProfilePage() {
  const router = useRouter();

  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadMe() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
      credentials: "include",
    });

    const data: MeResponse = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || "Greška pri učitavanju profila.");
    }

    const user = data.user || null;
    setMe(user);

    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        await loadMe();
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    setActionMsg(null);
    setActionError(null);

    if (!name.trim() || !email.trim()) {
      setActionError("Ime i email su obavezni.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
          }),
        },
      );

      const data: MeResponse & { message?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Ažuriranje profila nije uspelo.");
      }

      setActionMsg(data.message || "Profil je uspešno ažuriran.");

      if (data.user) {
        setMe(data.user);
        setName(data.user.name || "");
        setEmail(data.user.email || "");
      } else {
        await loadMe();
      }
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri ažuriranju profila.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProfile() {
    const confirmed = window.confirm(
      "Da li si siguran da želiš da obrišeš svoj nalog? Ova akcija je trajna.",
    );

    if (!confirmed) return;

    setActionMsg(null);
    setActionError(null);
    setDeleting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Brisanje profila nije uspelo.");
      }

      router.replace("/travels");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Došlo je do greške pri brisanju profila.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          Učitavanje profila...
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
      <div className="mx-auto max-w-5xl">
        <section className="mb-6 rounded-3xl border border-emerald-500/20 bg-linear-to-br from-emerald-600/20 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
                Profil korisnika
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white">
                Pregled i izmena ličnih podataka
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Ovde možeš da pregledaš svoj nalog, izmeniš ime i email i po
                potrebi obrišeš svoj profil.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/travels"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Javna putovanja
              </Link>

              {me.role === "OPERATOR" ? (
                <Link
                  href="/admin"
                  className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 font-medium text-purple-200 transition hover:bg-purple-500/20"
                >
                  Admin panel
                </Link>
              ) : null}

              <Link
                href="/logout"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Logout
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
              Rola: {me.role}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                me.emailVerified
                  ? "border-green-500/30 bg-green-500/10 text-green-200"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              {me.emailVerified
                ? "Email verifikovan"
                : "Email nije verifikovan"}
            </span>
            {me.hasGoogleAccount ? (
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-200">
                Google nalog povezan
              </span>
            ) : null}
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-white">Izmena profila</h2>
              <p className="mt-1 text-sm text-slate-400">
                Možeš da promeniš svoje ime i email adresu.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Ime
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Unesi ime"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Unesi email"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Čuvanje..." : "Sačuvaj izmene"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-white">Detalji naloga</h2>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm text-slate-400">Trenutno ime</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {me.name || "Nema imena"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm text-slate-400">Trenutni email</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {me.email}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm text-slate-400">Poslednji login</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatDate(me.lastLoginAt)}
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm font-semibold text-red-200">
                  Opasna akcija
                </p>
                <p className="mt-2 text-sm text-red-100/90">
                  Brisanje profila je trajno i uklanja tvoj nalog iz sistema.
                </p>

                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  disabled={deleting}
                  className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? "Brisanje..." : "Obriši moj profil"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">Istorija prijava</h2>
            <p className="mt-1 text-sm text-slate-400">
              Poslednje zabeležene prijave na tvoj nalog.
            </p>
          </div>

          {!me.loginHistory || me.loginHistory.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
              Nema zabeležene istorije prijava.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Vreme
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      IP
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      User agent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {me.loginHistory.map((entry, index) => (
                    <tr
                      key={`${entry.at || "entry"}-${index}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/40"
                    >
                      <td className="rounded-l-2xl px-4 py-4 text-sm text-white">
                        {formatDate(entry.at)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-300">
                        {entry.ip || "Nema podatka"}
                      </td>
                      <td className="rounded-r-2xl px-4 py-4 text-sm text-slate-300">
                        {entry.userAgent || "Nema podatka"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

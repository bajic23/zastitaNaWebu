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

type LogUser = {
  name?: string;
  email?: string;
  role?: UserRole;
};

type AccessLogItem = {
  _id?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  createdAt?: string;
  userId?: LogUser | null;
};

type LogsResponse = {
  logs: AccessLogItem[];
  message?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Nema podatka";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Nema podatka";

  return date.toLocaleString("sr-RS");
}

function getMethodTone(method?: string) {
  switch ((method || "").toUpperCase()) {
    case "GET":
      return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    case "POST":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "PUT":
    case "PATCH":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "DELETE":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    default:
      return "border-slate-700 bg-slate-800 text-slate-200";
  }
}

function getStatusTone(statusCode?: number) {
  if (!statusCode) {
    return "border-slate-700 bg-slate-800 text-slate-200";
  }

  if (statusCode >= 200 && statusCode < 300) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (statusCode >= 300 && statusCode < 400) {
    return "border-blue-500/30 bg-blue-500/10 text-blue-200";
  }

  if (statusCode >= 400 && statusCode < 500) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  return "border-red-500/30 bg-red-500/10 text-red-200";
}

export default function AdminLogsPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  async function loadLogs() {
    const logsRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/access-logs`,
      {
        credentials: "include",
      },
    );

    const logsData: LogsResponse = await logsRes.json();

    if (!logsRes.ok) {
      throw new Error(logsData?.message || "Greška pri učitavanju logova.");
    }

    setLogs(logsData.logs || []);
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
          throw new Error("Nemate pristup pristupnim logovima.");
        }

        setMe(meData.user);

        await loadLogs();
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

  const totalLogs = useMemo(() => logs.length, [logs]);
  const successfulLogs = useMemo(
    () =>
      logs.filter(
        (log) => (log.statusCode || 0) >= 200 && (log.statusCode || 0) < 300,
      ).length,
    [logs],
  );
  const clientErrorLogs = useMemo(
    () =>
      logs.filter(
        (log) => (log.statusCode || 0) >= 400 && (log.statusCode || 0) < 500,
      ).length,
    [logs],
  );
  const serverErrorLogs = useMemo(
    () => logs.filter((log) => (log.statusCode || 0) >= 500).length,
    [logs],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          Učitavanje logova...
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
              href="/admin"
              className="inline-block rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Nazad na admin panel
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl border border-indigo-500/20 bg-linear-to-br from-indigo-600/20 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-300">
                Pristupni logovi
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white">
                Pregled pristupa sistemu
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Operator može da pregleda evidenciju pristupa API rutama,
                korisnike koji su izvršili zahteve, status odgovora i vreme
                pristupa sistemu.
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
                href="/admin/destinations"
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 font-medium text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Destinacije
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
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-200">
              OPERATOR pristup
            </span>
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-medium text-green-200">
              Evidencija API pristupa
            </span>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Ukupno logova</p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {totalLogs}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Zabeleženi pristupi API rutama.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Uspešni zahtevi</p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {successfulLogs}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Odgovori sa 2xx status kodom.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Client greške</p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {clientErrorLogs}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Zahtevi sa 4xx status kodom.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Server greške</p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {serverErrorLogs}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Zahtevi sa 5xx status kodom.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">
              Poslednji pristupni logovi
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Pregled poslednjih zabeleženih API pristupa u sistemu.
            </p>
          </div>

          {logs.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-6 text-center text-sm text-slate-400">
              Nema dostupnih pristupnih logova.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Korisnik
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Rola
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Method
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Path
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      IP
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">
                      Vreme
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log, index) => (
                    <tr
                      key={log._id || `${log.path}-${index}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/40"
                    >
                      <td className="rounded-l-2xl px-4 py-4 text-sm font-medium text-white">
                        {log.userId?.name || "Nepoznat korisnik"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-200">
                        {log.userId?.email || "Nema podatka"}
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                          {log.userId?.role || "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getMethodTone(log.method)}`}
                        >
                          {log.method || "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-300">
                        <span className="break-all">{log.path || "N/A"}</span>
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(log.statusCode)}`}
                        >
                          {log.statusCode ?? "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-300">
                        {log.ip || "N/A"}
                      </td>

                      <td className="rounded-r-2xl px-4 py-4 text-sm text-slate-300">
                        {formatDate(log.createdAt)}
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LogUser = {
  name?: string;
  email?: string;
  role?: "USER" | "MANAGER" | "ADMIN";
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
};

type MeResponse = {
  user: {
    id: string;
    name?: string;
    email: string;
    role: "USER" | "MANAGER" | "ADMIN";
    emailVerified: boolean;
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

export default function LogsPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

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

        if (!["ADMIN", "MANAGER"].includes(meData.user.role)) {
          throw new Error("Nemate pristup access logovima.");
        }

        setMe(meData.user);

        const logsRes = await fetch(
          "http://localhost:5000/api/admin/access-logs",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const logsData: LogsResponse = await logsRes.json();

        if (!logsRes.ok) {
          throw new Error(
            logsData?.logs
              ? "Greška pri učitavanju logova."
              : "Greška pri učitavanju logova.",
          );
        }

        setLogs(logsData.logs || []);
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

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          Učitavanje logova...
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
        <section className="mb-6 rounded-3xl border border-blue-500/20 bg-linear-to-br from-blue-600/20 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
                Access logs
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white">
                Pregled pristupa sistemu
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Ova stranica prikazuje evidenciju pristupa API rutama i dostupna
                je za MANAGER i ADMIN korisnike.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={me.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Nazad
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-200">
              Pristup: {me.role}
            </span>
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-medium text-green-200">
              Evidencija API pristupa
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">
              Poslednji access logovi
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Pregled poslednjih 100 API pristupa zabeleženih u sistemu.
            </p>
          </div>

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
                {logs.length > 0 ? (
                  logs.map((log, index) => (
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

                      <td className="px-4 py-4 text-sm font-semibold text-blue-200">
                        {log.method || "N/A"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-300">
                        {log.path || "N/A"}
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
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
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-6 text-center text-sm text-slate-400"
                    >
                      Nema dostupnih access logova.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function LogoutPage() {
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("Odjavljivanje...");

  useEffect(() => {
    async function logout() {
      const refreshToken = localStorage.getItem("refreshToken");

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              refreshToken,
            }),
          },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMessage(data?.message || "Odjava završena.");
        } else {
          setMessage("Uspešno ste se odjavili");
        }
      } catch {
        setMessage("Uspešno ste se odjavili");
      } finally {
        localStorage.removeItem("refreshToken");
        setDone(true);

        setTimeout(() => {
          window.location.replace("/travels");
        }, 1500);
      }
    }

    logout();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-lg">
        {!done ? (
          <>
            <p className="text-sm text-slate-400">{message}</p>
            <div className="mt-4 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-white">{message}</p>
            <p className="mt-2 text-sm text-slate-400">
              Preusmeravanje na početnu stranicu...
            </p>
          </>
        )}
      </div>
    </main>
  );
}

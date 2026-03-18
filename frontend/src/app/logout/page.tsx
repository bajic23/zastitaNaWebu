"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function logout() {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // čak i ako pukne, nastavljamo
      } finally {
        setDone(true);

        // delay da korisnik vidi poruku
        setTimeout(() => {
          router.replace("/travels");
        }, 1500);
      }
    }

    logout();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-lg">
        {!done ? (
          <>
            <p className="text-sm text-slate-400">Odjavljivanje...</p>

            <div className="mt-4 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-white">
              Uspešno ste se odjavili
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Preusmeravanje na početnu stranicu...
            </p>
          </>
        )}
      </div>
    </main>
  );
}

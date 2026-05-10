"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const refreshToken = searchParams.get("refreshToken");

    if (!refreshToken) {
      router.replace("/login?error=missing_google_tokens");
      return;
    }

    localStorage.setItem("refreshToken", refreshToken);

    router.replace("/travels");
    router.refresh();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <p className="text-sm text-slate-300">Prijava u toku...</p>
    </main>
  );
}

export default function LoginSuccessPage() {
  return (
    <Suspense fallback={null}>
      <LoginSuccessContent />
    </Suspense>
  );
}

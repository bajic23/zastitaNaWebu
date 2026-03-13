"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");

    if (!token || !refreshToken) {
      router.replace("/login?error=missing_google_tokens");
      return;
    }

    localStorage.setItem("token", token);
    localStorage.setItem("refreshToken", refreshToken);

    document.cookie = `access_token=${token}; path=/; samesite=lax`;

    router.replace("/dashboard");
  }, [router, searchParams]);

  return <p>Prijava u toku...</p>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("mfa_email");

    if (!storedEmail) {
      router.replace("/login");
      return;
    }

    setEmail(storedEmail);
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!email || !otp.trim()) {
      setMsg("Unesi OTP kod.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, otp: otp.trim() }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "OTP verification failed");
        return;
      }

      if (data?.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      sessionStorage.removeItem("mfa_email");

      if (data?.user?.role === "OPERATOR") {
        router.replace("/admin");
      } else {
        router.replace("/travels");
      }

      router.refresh();
    } catch {
      setMsg("Greska pri konekciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (!email) {
      return;
    }

    setMsg(null);
    setResending(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "Resend OTP failed");
        return;
      }

      setMsg("Novi OTP je generisan. Proveri backend konzolu.");
    } catch {
      setMsg("Greska pri konekciji sa serverom.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="w-120 max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur">
          <section className="p-6">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
                  Zastita na Webu
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  Two-Factor Verification
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Unesi sestocifreni OTP kod generisan za {email || "tvoj nalog"}.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="otp"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    OTP kod
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    autoComplete="one-time-code"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {msg ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {msg}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Provera u toku..." : "Verify OTP"}
                </button>
              </form>

              <button
                type="button"
                disabled={resending || !email}
                onClick={resendOtp}
                className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? "Slanje u toku..." : "Resend OTP"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

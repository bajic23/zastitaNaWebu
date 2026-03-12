"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    document.cookie = "access_token=; Path=/; Max-Age=0";
    document.cookie = "role=; Path=/; Max-Age=0";
    router.replace("/login");
  }, [router]);

  return null;
}

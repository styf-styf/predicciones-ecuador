"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogin = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace("/");
      } else {
        router.replace("/login");
      }
    };

    handleLogin();
  }, []);

  return <p>Iniciando sesión...</p>;
}
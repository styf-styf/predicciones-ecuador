"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      const { data } = await supabase.auth.getUser();

      const user = data.user;

      if (!user) {
        router.push("/login");
        return;
      }

      // 🔥 guardar en tu backend (sin duplicar)
      await fetch("https://predicciones-ecuador.onrender.com/sync-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: user.user_metadata?.full_name || "",
          picture: user.user_metadata?.avatar_url || "",
        }),
      });

      router.push("/");
    };

    handle();
  }, [router]);

  return <p className="text-white">Iniciando sesión...</p>;
}
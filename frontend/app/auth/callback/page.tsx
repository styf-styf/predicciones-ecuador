"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const loginGoogle = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      const user = data.session.user;
      const email = user.email || "";

      // Buscar usuario en tabla users
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (!existingUser) {
        await supabase.from("users").insert({
          email,
          password: "",
          points: 0,
          role: "user",
          nombre: user.user_metadata.full_name || "",
          apellido: "",
          cedula: "",
          celular: "",
          pais: "",
          ciudad: "",
          direccion: "",
        });
      }

      localStorage.setItem("token", "google-login");
      localStorage.setItem("role", existingUser?.role || "user");
      localStorage.setItem("points", String(existingUser?.points || 0));

      router.replace("/");
    };

    loginGoogle();
  }, []);

  return <p>Iniciando sesión...</p>;
}
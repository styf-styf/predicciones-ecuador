"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Callback() {
  const router = useRouter();
  useEffect(() => {
    router.push("/login");
  }, [router]);
  return <p>Redirigiendo...</p>;
}

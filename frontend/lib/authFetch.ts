/**
 * Wrapper de fetch que maneja automáticamente tokens expirados (401).
 * Si la API devuelve 401, limpia la sesión y redirige al login.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("points");
    window.dispatchEvent(new Event("auth-change"));
    // Guardamos la ruta actual para redirigir de vuelta después del login
    const current = window.location.pathname;
    window.location.href = `/login?expired=1${current !== "/login" ? `&next=${encodeURIComponent(current)}` : ""}`;
  }

  return res;
}

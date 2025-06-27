// src/pages/api/auth/logout.ts
import type { APIRoute } from "astro";
import { supabase } from "../../../db/supabaseClient";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  // 1. Cerrar sesión en Supabase
  const { error } = await supabase.auth.signOut();

  // 2. Eliminar cookies
  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });

  // 3. Redirigir al inicio
  return redirect("/");
};
